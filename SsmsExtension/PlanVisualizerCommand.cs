using System;
using System.ComponentModel.Design;
using Microsoft.VisualStudio.Shell;
using Task = System.Threading.Tasks.Task;

namespace SsmsPlanVisualizer
{
    /// <summary>
    /// Command handler for opening the SQL Execution Plan Visualizer ToolWindow in SSMS.
    /// Binds to Tools menu, View menu, and Standard toolbar.
    /// </summary>
    internal sealed class PlanVisualizerCommand
    {
        public const int ToolsCommandId = 0x0100;
        public const int ViewCommandId = 0x0101;
        public const int ToolbarCommandId = 0x0102;

        public static readonly Guid CommandSet = new Guid("8a97c45d-7a6e-4122-bc51-0985223c348f");

        private readonly AsyncPackage _package;

        private PlanVisualizerCommand(AsyncPackage package, OleMenuCommandService commandService)
        {
            _package = package ?? throw new ArgumentNullException(nameof(package));
            commandService = commandService ?? throw new ArgumentNullException(nameof(commandService));

            // Register Tools menu command
            var toolsCmdID = new CommandID(CommandSet, ToolsCommandId);
            commandService.AddCommand(new MenuCommand(Execute, toolsCmdID));

            // Register View menu command
            var viewCmdID = new CommandID(CommandSet, ViewCommandId);
            commandService.AddCommand(new MenuCommand(Execute, viewCmdID));

            // Register Standard Toolbar command
            var toolbarCmdID = new CommandID(CommandSet, ToolbarCommandId);
            commandService.AddCommand(new MenuCommand(Execute, toolbarCmdID));
        }

        public static PlanVisualizerCommand Instance { get; private set; }

        public static async Task InitializeAsync(AsyncPackage package)
        {
            await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync(package.DisposalToken);
            var commandService = await package.GetServiceAsync(typeof(IMenuCommandService)) as OleMenuCommandService;
            Instance = new PlanVisualizerCommand(package, commandService);
        }

        private void Execute(object sender, EventArgs e)
        {
            ThreadHelper.ThrowIfNotOnUIThread();

            var window = _package.FindToolWindow(typeof(PlanVisualizerToolWindow), 0, true);
            if (window?.Frame == null)
            {
                throw new NotSupportedException("Cannot create SQL Execution Plan Visualizer tool window.");
            }

            var windowFrame = (Microsoft.VisualStudio.Shell.Interop.IVsWindowFrame)window.Frame;
            Microsoft.VisualStudio.ErrorHandler.ThrowOnFailure(windowFrame.Show());
        }
    }
}
