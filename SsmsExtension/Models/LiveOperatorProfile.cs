using System.Text.Json.Serialization;

namespace SsmsPlanVisualizer.Models
{
    /// <summary>
    /// Represents live per-node runtime execution metrics polled from sys.dm_exec_query_profiles.
    /// </summary>
    public class LiveOperatorProfile
    {
        [JsonPropertyName("sessionId")]
        public int SessionId { get; set; }

        [JsonPropertyName("requestId")]
        public int RequestId { get; set; }

        [JsonPropertyName("nodeId")]
        public int NodeId { get; set; }

        [JsonPropertyName("physicalOperatorName")]
        public string PhysicalOperatorName { get; set; }

        [JsonPropertyName("threadId")]
        public int ThreadId { get; set; }

        [JsonPropertyName("rowCount")]
        public long RowCount { get; set; }

        [JsonPropertyName("estimateRowCount")]
        public long EstimateRowCount { get; set; }

        [JsonPropertyName("elapsedTimeMs")]
        public long ElapsedTimeMs { get; set; }

        [JsonPropertyName("cpuTimeMs")]
        public long CpuTimeMs { get; set; }

        [JsonPropertyName("logicalReadCount")]
        public long LogicalReadCount { get; set; }

        [JsonPropertyName("physicalReadCount")]
        public long PhysicalReadCount { get; set; }
    }
}
