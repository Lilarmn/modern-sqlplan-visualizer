using System;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.VisualStudio;
using Microsoft.VisualStudio.Shell;
using Task = System.Threading.Tasks.Task;

namespace SsmsPlanVisualizer
{
    [PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
    [InstalledProductRegistration("SQL Server Execution Plan Visualizer", "Interactive Bottleneck Analyzer with True Cost Isolation and Live DMV Polling", "1.0")]
    [ProvideMenuResource("Menus.ctmenu", 1)]
    [ProvideAutoLoad(VSConstants.UICONTEXT.NoSolution_string, PackageAutoLoadFlags.BackgroundLoad)]
    [ProvideAutoLoad(VSConstants.UICONTEXT.SolutionExists_string, PackageAutoLoadFlags.BackgroundLoad)]
    [ProvideAutoLoad("e80ef1cb-6d64-4609-8faa-feacfd3bc89f", PackageAutoLoadFlags.BackgroundLoad)] // SSMS Active Query Window Context
    [ProvideToolWindow(typeof(PlanVisualizerToolWindow), Style = VsDockStyle.Tabbed, Window = "DocumentWell")]
    [Guid(PackageGuidString)]
    public sealed class SsmsPlanVisualizerPackage : AsyncPackage
    {
        public const string PackageGuidString = "e4a7d620-8332-4740-b6ec-7d0e808169e5";

        protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress)
        {
            await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
            await PlanVisualizerCommand.InitializeAsync(this);
        }
    }
}
