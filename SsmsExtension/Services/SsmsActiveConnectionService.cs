using System;
using System.Collections.Generic;
using System.Data;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;

namespace SsmsPlanVisualizer.Services
{
    public class SsmsConnectionDetails
    {
        public string ServerName { get; set; } = "localhost";
        public string DatabaseName { get; set; } = "master";
        public string UserName { get; set; }
        public bool UseIntegratedSecurity { get; set; } = true;
        public int SessionId { get; set; } = 50;

        public string BuildConnectionString()
        {
            var builder = new SqlConnectionStringBuilder
            {
                DataSource = string.IsNullOrWhiteSpace(ServerName) ? "localhost" : ServerName,
                InitialCatalog = string.IsNullOrWhiteSpace(DatabaseName) ? "master" : DatabaseName,
                IntegratedSecurity = UseIntegratedSecurity,
                TrustServerCertificate = true,
                ApplicationName = "SSMS Plan Visualizer Extension"
            };

            if (!UseIntegratedSecurity && !string.IsNullOrWhiteSpace(UserName))
            {
                builder.UserID = UserName;
            }

            return builder.ConnectionString;
        }
    }

    public class RunningSessionInfo
    {
        public int SessionId { get; set; }
        public string Status { get; set; }
        public string DatabaseName { get; set; }
        public string Command { get; set; }
        public long CpuTimeMs { get; set; }
        public long TotalElapsedTimeMs { get; set; }
        public string QuerySnippet { get; set; }

        public override string ToString()
        {
            return $"SPID {SessionId} [{DatabaseName}] - {Command} ({TotalElapsedTimeMs} ms)";
        }
    }

    /// <summary>
    /// Service to discover active connections and query running sessions in SSMS.
    /// Uses reflection to remain version-agnostic across SSMS 19 and SSMS 20.
    /// </summary>
    public class SsmsActiveConnectionService
    {
        public static SsmsConnectionDetails TryGetActiveWindowConnection()
        {
            var details = new SsmsConnectionDetails();

            try
            {
                // Access Microsoft.SqlServer.Management.UI.VSIntegration.ServiceCache via reflection
                var serviceCacheType = Type.GetType("Microsoft.SqlServer.Management.UI.VSIntegration.ServiceCache, ObjectExplorer", false)
                    ?? Type.GetType("Microsoft.SqlServer.Management.UI.VSIntegration.ServiceCache, SqlWorkbench.Interfaces", false);

                if (serviceCacheType != null)
                {
                    var scriptFactoryProp = serviceCacheType.GetProperty("ScriptFactory", BindingFlags.Public | BindingFlags.Static);
                    var scriptFactory = scriptFactoryProp?.GetValue(null);

                    if (scriptFactory != null)
                    {
                        var activeConnProp = scriptFactory.GetType().GetProperty("CurrentlyActiveWndConnectionInfo", BindingFlags.Public | BindingFlags.Instance);
                        var connInfo = activeConnProp?.GetValue(scriptFactory);

                        if (connInfo != null)
                        {
                            var uiConnProp = connInfo.GetType().GetProperty("UIConnectionInfo", BindingFlags.Public | BindingFlags.Instance);
                            var uiConn = uiConnProp?.GetValue(connInfo);

                            if (uiConn != null)
                            {
                                var serverNameProp = uiConn.GetType().GetProperty("ServerName");
                                var serverVersionProp = uiConn.GetType().GetProperty("ServerVersion");
                                var authTypeProp = uiConn.GetType().GetProperty("AuthenticationType");
                                var userNameProp = uiConn.GetType().GetProperty("UserName");
                                var advancedOptionsProp = uiConn.GetType().GetProperty("AdvancedOptions");

                                details.ServerName = serverNameProp?.GetValue(uiConn)?.ToString() ?? "localhost";
                                details.UserName = userNameProp?.GetValue(uiConn)?.ToString();

                                // Check authentication type (0 = Windows Auth)
                                if (authTypeProp != null)
                                {
                                    var authVal = Convert.ToInt32(authTypeProp.GetValue(uiConn));
                                    details.UseIntegratedSecurity = (authVal == 0);
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Fallback to sensible defaults if SSMS internal API reflection fails
            }

            return details;
        }

        /// <summary>
        /// Queries the target server for running user sessions executing queries.
        /// </summary>
        public static async Task<List<RunningSessionInfo>> GetRunningSessionsAsync(string connectionString)
        {
            var list = new List<RunningSessionInfo>();

            const string sql = @"
                SELECT 
                    r.session_id,
                    r.status,
                    DB_NAME(r.database_id) AS database_name,
                    r.command,
                    r.cpu_time,
                    r.total_elapsed_time,
                    SUBSTRING(t.text, (r.statement_start_offset/2)+1, 
                        ((CASE r.statement_end_offset 
                            WHEN -1 THEN DATALENGTH(t.text) 
                            ELSE r.statement_end_offset 
                          END - r.statement_start_offset)/2) + 1) AS query_snippet
                FROM sys.dm_exec_requests r
                CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) t
                WHERE r.session_id != @@SPID AND r.session_id >= 50
                ORDER BY r.total_elapsed_time DESC;";

            using (var conn = new SqlConnection(connectionString))
            {
                await conn.OpenAsync().ConfigureAwait(false);
                using (var cmd = new SqlCommand(sql, conn))
                {
                    cmd.CommandTimeout = 5;
                    using (var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false))
                    {
                        while (await reader.ReadAsync().ConfigureAwait(false))
                        {
                            list.Add(new RunningSessionInfo
                            {
                                SessionId = reader.GetInt16(0),
                                Status = reader.GetString(1),
                                DatabaseName = reader.IsDBNull(2) ? "master" : reader.GetString(2),
                                Command = reader.GetString(3),
                                CpuTimeMs = reader.GetInt32(4),
                                TotalElapsedTimeMs = reader.GetInt32(5),
                                QuerySnippet = reader.IsDBNull(6) ? "" : reader.GetString(6).Trim()
                            });
                        }
                    }
                }
            }

            return list;
        }
    }
}
