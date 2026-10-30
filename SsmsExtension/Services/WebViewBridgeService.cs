using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using SsmsPlanVisualizer.Models;

namespace SsmsPlanVisualizer.Services
{
    /// <summary>
    /// Service that wraps Microsoft Edge CoreWebView2 messaging, serializing and deserializing
    /// communication between the C# VSIX host and the React Execution Plan application.
    /// </summary>
    public class WebViewBridgeService
    {
        private CoreWebView2 _coreWebView2;
        private readonly JsonSerializerOptions _jsonOptions;

        public event Action<ClientBridgeMessage> OnClientMessageReceived;

        public WebViewBridgeService()
        {
            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = false
            };
        }

        public void Attach(CoreWebView2 coreWebView2)
        {
            _coreWebView2 = coreWebView2 ?? throw new ArgumentNullException(nameof(coreWebView2));
            _coreWebView2.WebMessageReceived += HandleWebMessageReceived;
        }

        public void Detach()
        {
            if (_coreWebView2 != null)
            {
                _coreWebView2.WebMessageReceived -= HandleWebMessageReceived;
                _coreWebView2 = null;
            }
        }

        private void HandleWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var json = e.WebMessageAsJson;
                if (!string.IsNullOrWhiteSpace(json))
                {
                    var msg = JsonSerializer.Deserialize<ClientBridgeMessage>(json, _jsonOptions);
                    if (msg != null)
                    {
                        OnClientMessageReceived?.Invoke(msg);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[WebViewBridgeService] Error parsing client message: {ex.Message}");
            }
        }

        public void PostMessage(string type, object payload)
        {
            if (_coreWebView2 == null) return;

            try
            {
                var msg = new HostBridgeMessage(type, payload);
                var json = JsonSerializer.Serialize(msg, _jsonOptions);
                _coreWebView2.PostWebMessageAsJson(json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[WebViewBridgeService] Error posting message {type}: {ex.Message}");
            }
        }

        public void SendPlanXml(string xml)
        {
            PostMessage("LOAD_PLAN_XML", xml);
        }

        public void SendLiveProfileUpdate(string xmlOrProfiles)
        {
            PostMessage("LIVE_PROFILE_UPDATE", xmlOrProfiles);
        }

        public void SendLiveStatus(LiveStatusPayload status)
        {
            PostMessage("LIVE_STATUS_CHANGE", status);
        }

        public void FocusNode(string nodeId)
        {
            PostMessage("FOCUS_NODE", new { nodeId });
        }
    }
}
