using System;
using System.IO;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;
using SsmsPlanVisualizer.Models;
using SsmsPlanVisualizer.Services;

namespace SsmsPlanVisualizer
{
    public partial class PlanVisualizerControl : UserControl, IDisposable
    {
        private readonly WebViewBridgeService _bridge;
        private readonly LiveDmvPoller _poller;
        private bool _isWebViewInitialized;

        public PlanVisualizerControl()
        {
            InitializeComponent();

            _bridge = new WebViewBridgeService();
            _bridge.OnClientMessageReceived += HandleClientMessage;

            _poller = new LiveDmvPoller();
            _poller.OnLivePlanXmlReceived += HandleLivePlanXmlReceived;
            _poller.OnStatusChanged += HandlePollerStatusChanged;

            Loaded += PlanVisualizerControl_Loaded;
            Unloaded += PlanVisualizerControl_Unloaded;
        }

        private async void PlanVisualizerControl_Loaded(object sender, RoutedEventArgs e)
        {
            if (_isWebViewInitialized) return;

            try
            {
                // Auto-detect connection from active SSMS script window
                DetectActiveConnection();

                // Create dedicated WebView2 user data folder in LocalAppData
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string userDataFolder = Path.Combine(localAppData, "Microsoft", "SSMS", "WebView2_PlanVisualizer");
                Directory.CreateDirectory(userDataFolder);

                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder).ConfigureAwait(true);
                await MainWebView.EnsureCoreWebView2Async(env).ConfigureAwait(true);

                _bridge.Attach(MainWebView.CoreWebView2);
                _isWebViewInitialized = true;

                // Determine path to built React application
                string assemblyDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? "";
                string distPath = Path.Combine(assemblyDir, "dist", "index.html");

                // In development environment, search up directory tree if dist is alongside project
                if (!File.Exists(distPath))
                {
                    string devDist = Path.GetFullPath(Path.Combine(assemblyDir, "..", "..", "..", "dist", "index.html"));
                    if (File.Exists(devDist))
                    {
                        distPath = devDist;
                    }
                }

                if (File.Exists(distPath))
                {
                    string folder = Path.GetDirectoryName(distPath);
                    MainWebView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                        "planvisualizer.local",
                        folder,
                        CoreWebView2HostResourceAccessKind.Allow
                    );
                    MainWebView.CoreWebView2.Navigate("https://planvisualizer.local/index.html");
                }
                else
                {
                    // If no pre-built file is found, navigate to local dev server or show message
                    MainWebView.CoreWebView2.Navigate("http://localhost:3000");
                }

                SetStatus("Ready (Visualizer loaded)", Colors.SlateGray);
            }
            catch (Exception ex)
            {
                SetStatus($"WebView2 Initialization failed: {ex.Message}", Colors.Red);
            }
        }

        private void PlanVisualizerControl_Unloaded(object sender, RoutedEventArgs e)
        {
            _poller?.StopPolling();
        }

        private void DetectActiveConnection()
        {
            try
            {
                var conn = SsmsActiveConnectionService.TryGetActiveWindowConnection();
                if (conn != null)
                {
                    TxtServer.Text = conn.ServerName;
                    TxtDatabase.Text = conn.DatabaseName;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to auto-detect connection: {ex.Message}");
            }
        }

        private void BtnDetectConn_Click(object sender, RoutedEventArgs e)
        {
            DetectActiveConnection();
            SetStatus($"Detected connection: {TxtServer.Text} [{TxtDatabase.Text}]", Colors.LightSkyBlue);
        }

        private async void BtnRefreshSessions_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var conn = new SsmsConnectionDetails
                {
                    ServerName = TxtServer.Text,
                    DatabaseName = TxtDatabase.Text,
                    UseIntegratedSecurity = true
                };

                SetStatus("Scanning running sessions...", Color.FromRgb(245, 158, 11));
                var sessions = await SsmsActiveConnectionService.GetRunningSessionsAsync(conn.BuildConnectionString()).ConfigureAwait(true);

                CmbRunningSessions.Items.Clear();
                if (sessions.Count > 0)
                {
                    CmbRunningSessions.Visibility = Visibility.Visible;
                    foreach (var s in sessions)
                    {
                        CmbRunningSessions.Items.Add(s);
                    }
                    CmbRunningSessions.SelectedIndex = 0;
                    SetStatus($"Found {sessions.Count} active query session(s).", Color.FromRgb(16, 185, 129));
                }
                else
                {
                    CmbRunningSessions.Visibility = Visibility.Collapsed;
                    SetStatus("No active long-running queries currently executing.", Colors.SlateGray);
                }
            }
            catch (Exception ex)
            {
                SetStatus($"Scan failed: {ex.Message}", Colors.Red);
            }
        }

        private void CmbRunningSessions_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (CmbRunningSessions.SelectedItem is RunningSessionInfo session)
            {
                TxtSpid.Text = session.SessionId.ToString();
                SetStatus($"Selected SPID {session.SessionId}: {session.Command}", Colors.SkyBlue);
            }
        }

        private void BtnTogglePolling_Click(object sender, RoutedEventArgs e)
        {
            if (_poller.IsPolling)
            {
                _poller.StopPolling();
                BtnTogglePolling.Content = "▶ Start Live Polling";
                BtnTogglePolling.Background = new SolidColorBrush(Color.FromRgb(2, 132, 199)); // Sky-600
            }
            else
            {
                if (!int.TryParse(TxtSpid.Text, out int spid) || spid <= 0)
                {
                    MessageBox.Show("Please enter a valid numeric SPID (Session ID).", "Invalid SPID", MessageBoxButton.OK, MessageBoxImage.Warning);
                    return;
                }

                var conn = new SsmsConnectionDetails
                {
                    ServerName = TxtServer.Text,
                    DatabaseName = TxtDatabase.Text,
                    UseIntegratedSecurity = true,
                    SessionId = spid
                };

                try
                {
                    _poller.StartPolling(spid, conn.BuildConnectionString());
                    BtnTogglePolling.Content = "⏹ Stop Polling";
                    BtnTogglePolling.Background = new SolidColorBrush(Color.FromRgb(220, 38, 38)); // Red-600
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Failed to start DMV polling: {ex.Message}", "Connection Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void BtnOpenFile_Click(object sender, RoutedEventArgs e)
        {
            var dlg = new OpenFileDialog
            {
                Filter = "SQL Server Execution Plans (*.sqlplan;*.xml)|*.sqlplan;*.xml|All Files (*.*)|*.*",
                Title = "Select SQL Server Execution Plan"
            };

            if (dlg.ShowDialog() == true)
            {
                try
                {
                    string xml = File.ReadAllText(dlg.FileName);
                    _bridge.SendPlanXml(xml);
                    SetStatus($"Loaded file: {Path.GetFileName(dlg.FileName)}", Colors.SkyBlue);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Failed to read plan file: {ex.Message}", "File Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void HandleLivePlanXmlReceived(string xml)
        {
            Dispatcher.Invoke(() =>
            {
                _bridge.SendPlanXml(xml);
            });
        }

        private void HandlePollerStatusChanged(LiveStatusPayload status)
        {
            Dispatcher.Invoke(() =>
            {
                if (status.IsPolling)
                {
                    SetStatus(status.StatusMessage, Color.FromRgb(34, 197, 94)); // Emerald
                }
                else
                {
                    BtnTogglePolling.Content = "▶ Start Live Polling";
                    BtnTogglePolling.Background = new SolidColorBrush(Color.FromRgb(2, 132, 199));
                    SetStatus(status.StatusMessage, Colors.SlateGray);
                }
                _bridge.SendLiveStatus(status);
            });
        }

        private void HandleClientMessage(ClientBridgeMessage msg)
        {
            Dispatcher.Invoke(() =>
            {
                switch (msg.Type)
                {
                    case "REQUEST_LIVE_START":
                        if (!_poller.IsPolling)
                        {
                            BtnTogglePolling_Click(this, new RoutedEventArgs());
                        }
                        break;
                    case "REQUEST_LIVE_STOP":
                        if (_poller.IsPolling)
                        {
                            BtnTogglePolling_Click(this, new RoutedEventArgs());
                        }
                        break;
                    case "NODE_SELECTED":
                        // Can be used to navigate SSMS query editor to the statement offset
                        break;
                }
            });
        }

        private void SetStatus(string message, Color color)
        {
            TxtStatus.Text = message;
            StatusDot.Fill = new SolidColorBrush(color);
        }

        public void Dispose()
        {
            _poller?.Dispose();
            _bridge?.Detach();
        }
    }
}
