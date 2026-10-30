using System;
using System.Runtime.InteropServices;
using Microsoft.VisualStudio.Shell;

namespace SsmsPlanVisualizer
{
    [Guid("43b8c381-8b09-41e7-9d56-b088d22792d4")]
    public class PlanVisualizerToolWindow : ToolWindowPane
    {
        public PlanVisualizerToolWindow() : base(null)
        {
            Caption = "SQL Execution Plan Visualizer & Bottleneck Analyzer";
            Content = new PlanVisualizerControl();
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (Content is IDisposable disposable)
                {
                    disposable.Dispose();
                }
            }
            base.Dispose(disposing);
        }
    }
}
