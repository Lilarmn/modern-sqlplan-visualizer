using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using SsmsPlanVisualizer.Models;

namespace SsmsPlanVisualizer.Services
{
    /// <summary>
    /// Background service that polls SQL Server live query DMVs (sys.dm_exec_query_statistics_xml 
    /// and sys.dm_exec_query_profiles) every 500ms and notifies subscribers with real-time updates.
    /// </summary>
    public class LiveDmvPoller : IDisposable
    {
        private CancellationTokenSource _cts;
        private Task _pollingTask;
        private readonly object _lock = new object();
        private bool _isDisposed;

        public bool IsPolling { get; private set; }
        public int CurrentSessionId { get; private set; }
        public int PollIntervalMs { get; set; } = 500;

        public event Action<string> OnLivePlanXmlReceived;
        public event Action<List<LiveOperatorProfile>> OnLiveProfilesReceived;
        public event Action<LiveStatusPayload> OnStatusChanged;

        private const string QueryStatisticsXmlSql = @"
            SELECT CAST(query_plan AS NVARCHAR(MAX)) AS query_plan
            FROM sys.dm_exec_query_statistics_xml(@SessionId)
            WHERE query_plan IS NOT NULL;";

        private const string QueryProfilesSql = @"
            SELECT 
                session_id,
                request_id,
                node_id,
                physical_operator_name,
                thread_id,
                row_count,
                estimate_row_count,
                elapsed_time_ms,
                cpu_time_ms,
                logical_read_count,
                physical_read_count
            FROM sys.dm_exec_query_profiles
            WHERE session_id = @SessionId
            ORDER BY node_id, thread_id;";

        private const string CheckSessionActiveSql = @"
            SELECT COUNT(1) 
            FROM sys.dm_exec_requests 
            WHERE session_id = @SessionId;";

        public void StartPolling(int sessionId, string connectionString)
        {
            lock (_lock)
            {
                if (IsPolling)
                {
                    StopPolling();
                }

                if (sessionId <= 0)
                {
                    throw new ArgumentException("Session ID must be a positive integer.", nameof(sessionId));
                }

                if (string.IsNullOrWhiteSpace(connectionString))
                {
                    throw new ArgumentException("Connection string cannot be empty.", nameof(connectionString));
                }

                CurrentSessionId = sessionId;
                IsPolling = true;
                _cts = new CancellationTokenSource();

                NotifyStatus(true, sessionId, $"Polling live execution metrics for SPID {sessionId}...", 0);

                _pollingTask = Task.Run(() => PollingLoopAsync(sessionId, connectionString, _cts.Token));
            }
        }

        public void StopPolling()
        {
            lock (_lock)
            {
                if (!IsPolling) return;

                IsPolling = false;
                try
                {
                    _cts?.Cancel();
                    _pollingTask?.Wait(1000);
                }
                catch (Exception)
                {
                    // Ignore cancellation wait exceptions
                }
                finally
                {
                    _cts?.Dispose();
                    _cts = null;
                    _pollingTask = null;
                }

                NotifyStatus(false, CurrentSessionId, "Live DMV polling stopped.", 0);
            }
        }

        private async Task PollingLoopAsync(int sessionId, string connectionString, CancellationToken token)
        {
            var stopwatch = Stopwatch.StartNew();
            string lastPlanXml = null;
            bool wasActive = false;

            // Ensure Application Name is identifiable in SQL Server
            var builder = new SqlConnectionStringBuilder(connectionString)
            {
                ApplicationName = "SSMS Plan Visualizer Live Poller",
                ConnectTimeout = 5,
                Pooling = true
            };

            while (!token.IsCancellationRequested)
            {
                try
                {
                    using (var connection = new SqlConnection(builder.ConnectionString))
                    {
                        await connection.OpenAsync(token).ConfigureAwait(false);

                        // 1. Check if target session is actively executing a request
                        bool isActive = false;
                        using (var cmd = new SqlCommand(CheckSessionActiveSql, connection))
                        {
                            cmd.Parameters.Add("@SessionId", SqlDbType.Int).Value = sessionId;
                            cmd.CommandTimeout = 3;
                            var count = (int)await cmd.ExecuteScalarAsync(token).ConfigureAwait(false);
                            isActive = count > 0;
                        }

                        if (isActive)
                        {
                            wasActive = true;

                            // 2. Poll sys.dm_exec_query_statistics_xml
                            string currentXml = null;
                            using (var cmd = new SqlCommand(QueryStatisticsXmlSql, connection))
                            {
                                cmd.Parameters.Add("@SessionId", SqlDbType.Int).Value = sessionId;
                                cmd.CommandTimeout = 3;
                                using (var reader = await cmd.ExecuteReaderAsync(token).ConfigureAwait(false))
                                {
                                    if (await reader.ReadAsync(token).ConfigureAwait(false))
                                    {
                                        if (!reader.IsDBNull(0))
                                        {
                                            currentXml = reader.GetString(0);
                                        }
                                    }
                                }
                            }

                            if (!string.IsNullOrWhiteSpace(currentXml) && currentXml != lastPlanXml)
                            {
                                lastPlanXml = currentXml;
                                OnLivePlanXmlReceived?.Invoke(currentXml);
                            }

                            // 3. Poll sys.dm_exec_query_profiles for fine-grained per-thread live row counts
                            var profiles = new List<LiveOperatorProfile>();
                            using (var cmd = new SqlCommand(QueryProfilesSql, connection))
                            {
                                cmd.Parameters.Add("@SessionId", SqlDbType.Int).Value = sessionId;
                                cmd.CommandTimeout = 3;
                                using (var reader = await cmd.ExecuteReaderAsync(token).ConfigureAwait(false))
                                {
                                    while (await reader.ReadAsync(token).ConfigureAwait(false))
                                    {
                                        profiles.Add(new LiveOperatorProfile
                                        {
                                            SessionId = reader.GetInt16(0),
                                            RequestId = reader.GetInt32(1),
                                            NodeId = reader.GetInt32(2),
                                            PhysicalOperatorName = reader.GetString(3),
                                            ThreadId = reader.GetInt32(4),
                                            RowCount = reader.GetInt64(5),
                                            EstimateRowCount = reader.GetInt64(6),
                                            ElapsedTimeMs = reader.GetInt64(7),
                                            CpuTimeMs = reader.GetInt64(8),
                                            LogicalReadCount = reader.GetInt64(9),
                                            PhysicalReadCount = reader.GetInt64(10)
                                        });
                                    }
                                }
                            }

                            if (profiles.Count > 0)
                            {
                                OnLiveProfilesReceived?.Invoke(profiles);
                            }

                            NotifyStatus(true, sessionId, $"Query running on SPID {sessionId} ({stopwatch.ElapsedMilliseconds} ms)", stopwatch.ElapsedMilliseconds);
                        }
                        else
                        {
                            // Target session is no longer executing
                            if (wasActive)
                            {
                                // Attempt one final fetch of statistics XML to capture final counters
                                try
                                {
                                    using (var cmd = new SqlCommand(QueryStatisticsXmlSql, connection))
                                    {
                                        cmd.Parameters.Add("@SessionId", SqlDbType.Int).Value = sessionId;
                                        cmd.CommandTimeout = 3;
                                        var finalXml = (string)await cmd.ExecuteScalarAsync(token).ConfigureAwait(false);
                                        if (!string.IsNullOrWhiteSpace(finalXml))
                                        {
                                            OnLivePlanXmlReceived?.Invoke(finalXml);
                                        }
                                    }
                                }
                                catch
                                {
                                    // Session might be completely cleared from DMV cache
                                }

                                NotifyStatus(false, sessionId, $"Query completed on SPID {sessionId}. Total elapsed: {stopwatch.ElapsedMilliseconds} ms", stopwatch.ElapsedMilliseconds);
                                break;
                            }
                            else
                            {
                                NotifyStatus(true, sessionId, $"Waiting for query execution on SPID {sessionId}...", stopwatch.ElapsedMilliseconds);
                            }
                        }
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (SqlException sqlEx)
                {
                    string errNotice;
                    if (sqlEx.Number == 297 || sqlEx.Message.IndexOf("VIEW SERVER STATE", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        errNotice = "Permission denied: Live DMVs require 'VIEW SERVER PERFORMANCE STATE' (SQL 2022+) or 'VIEW SERVER STATE'.";
                    }
                    else
                    {
                        errNotice = $"SQL Error ({sqlEx.Number}): {sqlEx.Message}";
                    }

                    NotifyStatus(false, sessionId, errNotice, stopwatch.ElapsedMilliseconds);
                    break;
                }
                catch (Exception ex)
                {
                    NotifyStatus(false, sessionId, $"Polling Error: {ex.Message}", stopwatch.ElapsedMilliseconds);
                    break;
                }

                await Task.Delay(PollIntervalMs, token).ConfigureAwait(false);
            }

            IsPolling = false;
        }

        private void NotifyStatus(bool isPolling, int sessionId, string message, long elapsedMs)
        {
            OnStatusChanged?.Invoke(new LiveStatusPayload
            {
                IsPolling = isPolling,
                SessionId = sessionId,
                StatusMessage = message,
                ElapsedMs = elapsedMs
            });
        }

        public void Dispose()
        {
            if (_isDisposed) return;
            _isDisposed = true;
            StopPolling();
        }
    }
}
