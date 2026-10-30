using System.Text.Json.Serialization;

namespace SsmsPlanVisualizer.Models
{
    /// <summary>
    /// Message sent from the React WebView2 frontend to the SSMS C# host extension.
    /// </summary>
    public class ClientBridgeMessage
    {
        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("payload")]
        public object Payload { get; set; }
    }

    /// <summary>
    /// Message sent from SSMS C# host extension to the React WebView2 frontend.
    /// </summary>
    public class HostBridgeMessage
    {
        [JsonPropertyName("type")]
        public string Type { get; set; }

        [JsonPropertyName("payload")]
        public object Payload { get; set; }

        public HostBridgeMessage() { }

        public HostBridgeMessage(string type, object payload)
        {
            Type = type;
            Payload = payload;
        }
    }

    /// <summary>
    /// Payload when client or host requests live profiling status change.
    /// </summary>
    public class LiveStatusPayload
    {
        [JsonPropertyName("isPolling")]
        public bool IsPolling { get; set; }

        [JsonPropertyName("sessionId")]
        public int SessionId { get; set; }

        [JsonPropertyName("statusMessage")]
        public string StatusMessage { get; set; }

        [JsonPropertyName("elapsedMs")]
        public long ElapsedMs { get; set; }
    }
}
