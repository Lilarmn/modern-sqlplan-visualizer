# SQL Server Execution Plan Visualizer & Bottleneck Analyzer

A modern, production-grade SQL Server Execution Plan Visualizer designed to run both as a **standalone web application** (for analyzing `.sqlplan` XML files) and inside **SQL Server Management Studio (SSMS 19 & 20)** as a VSIX extension hosting Microsoft Edge WebView2.

---

## Key Flaws in Native SSMS & How We Solve Them

| Native SSMS Execution Plan Viewer | Our Execution Plan Visualizer |
| :--- | :--- |
| **Hides True Bottlenecks:** Calculates "Operator Cost %" using *Estimated Subtree Cost*, even in Actual Plans. | **True Cost Isolation:** Calculates **True Actual Cost %** by measuring each node's exclusive CPU ms and Logical Reads relative to total query runtime. |
| **Cluttered Trees:** Large procedures generate 100+ node trees that require endless horizontal panning. | **Auto-Collapse Healthy Subtrees:** Subtrees of >= 3 nodes with cumulative cost < 2% and no warnings are collapsed into clean summary badges. |
| **Buried Warnings:** Critical warnings (TempDB spills, implicit conversions) are buried in tiny tooltips. | **High-Visibility Radar & Badges:** Immediate pulsing badges, Top 5 Bottleneck Navigator bar, and actionable DBA / T-SQL tuning advice. |
| **Static Snapshots:** Can only view plans after a query finishes. | **Live DMV Poller:** Streams real-time live execution plans via `sys.dm_exec_query_statistics_xml` and `sys.dm_exec_query_profiles` every 500ms. |

---

## Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │                 SSMS 19 / 20                  │
                      │  ┌─────────────────────────────────────────┐  │
                      │  │   PlanVisualizerToolWindow (WPF / C#)   │  │
                      │  │                                         │  │
                      │  │  ┌───────────────────────────────────┐  │  │
                      │  │  │         WebView2 Control          │  │  │
                      │  │  │                                   │  │  │
                      │  │  │   React 18 + TS + React Flow UI   │  │  │
                      │  │  │   - Pipeline Canvas (Dagre LR/RL) │  │  │
                      │  │  │   - Top 5 Bottleneck Navigator    │  │  │
                      │  │  │   - Node Inspector Drawer         │  │  │
                      │  │  │   - CE Skew Radar & Heatmap       │  │  │
                      │  │  └─────────────────▲─────────────────┘  │  │
                      │  └────────────────────┼────────────────────┘  │
                      │                       │ PostWebMessageAsJson  │
                      │  ┌────────────────────▼────────────────────┐  │
                      │  │       WebViewBridgeService (C#)         │  │
                      │  └────────────────────▲────────────────────┘  │
                      │                       │                       │
                      │  ┌────────────────────┴────────────────────┐  │
                      │  │        LiveDmvPoller (500ms async)      │  │
                      │  └────────────────────▲────────────────────┘  │
                      └───────────────────────┼───────────────────────┘
                                              │ SqlConnection
                                              ▼
                                 ┌─────────────────────────┐
                                 │       SQL Server        │
                                 │ dm_exec_query_statistics│
                                 │ dm_exec_query_profiles  │
                                 └─────────────────────────┘
```

---

## Directory Structure

```
d:\prozhe\OTHERS\SSMS_EXTENSION\
├── src/                                  # Frontend React 18 + TypeScript Visualizer
│   ├── types/plan.ts                     # Execution plan, metrics & warning models
│   ├── parser/showplanParser.ts          # Browser-native DOMParser ShowPlanXML engine
│   ├── analyzer/bottleneckAnalyzer.ts    # Exclusive cost scoring, skew radar & tuning advice
│   ├── bridge/webviewBridge.ts           # Bidirectional WebView2 host communication bridge
│   ├── data/samplePlan.ts                # Built-in 18-node realistic demo plan with bottlenecks
│   ├── utils/formatters.ts               # Number, ms, bytes, and identifier formatters
│   ├── components/
│   │   ├── nodes/OperatorNode.tsx        # Custom React Flow operator card with dual progress bar
│   │   ├── nodes/CollapsedSubtreeNode.tsx# Summary node for collapsed healthy subtrees
│   │   ├── edges/DataFlowEdge.tsx        # Logarithmically scaled animated streaming edge
│   │   ├── BottleneckBar.tsx             # Top 5 Bottleneck quick-navigator
│   │   ├── NodeInspector.tsx             # Slide-over inspector drawer with thread skew chart
│   │   ├── Toolbar.tsx                   # Heatmap, Skew Radar, Focus Mode & Direction toggles
│   │   ├── XmlPasteModal.tsx             # Modal to paste raw XML or drop .sqlplan files
│   │   └── PipelineCanvas.tsx            # React Flow canvas with Dagre hierarchical layout
│   ├── App.tsx                           # Root application component
│   └── main.tsx                          # Application bootstrap
├── dist/                                 # Production build bundled into VSIX
├── SsmsExtension/                        # .NET Framework 4.8 C# VSIX Extension
│   ├── SsmsExtension.csproj              # VSIX MSBuild project file
│   ├── source.extension.vsixmanifest     # Targets SSMS 19/20 (Visual Studio 2022 Shell)
│   ├── SsmsPlanVisualizerPackage.cs      # AsyncPackage entry point
│   ├── PlanVisualizerCommand.cs          # SSMS Menu command
│   ├── PlanVisualizerToolWindow.cs       # ToolWindow hosting WPF control
│   ├── PlanVisualizerControl.xaml        # WPF UI with SPID selector & WebView2
│   ├── PlanVisualizerControl.xaml.cs     # Code-behind connecting WebView2 & DMV Poller
│   ├── Models/
│   │   ├── BridgeMessages.cs             # Strongly-typed JSON DTOs
│   │   └── LiveOperatorProfile.cs        # DMV query profile row representation
│   └── Services/
│       ├── LiveDmvPoller.cs              # 500ms async DMV polling engine
│       ├── SsmsActiveConnectionService.cs# Reflection-based active window connection discovery
│       └── WebViewBridgeService.cs       # CoreWebView2 JSON messaging coordinator
└── package.json                          # Vite + React + Tailwind + React Flow setup
```

---

## Building and Running

### 1. Web Application (Standalone Browser Mode)

To run the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser. The app loads with a built-in realistic demo execution plan containing:
- Hash Match with TempDB Spill across 4 threads
- Nested Loops driving a Key Lookup executed 120,000 times
- Clustered Index Scan with `CONVERT_IMPLICIT` preventing Index Seek
- Severe Cardinality Skew (100 estimated vs 450,000 actual rows)
- Parallel thread distribution skew (Thread 1 doing ~84% of all row reads)
- A 3-node dimension join subtree auto-collapsed (<2% runtime).

To build production assets:
```bash
npm run build
```
This generates the optimized bundle in `dist/`.

### 2. SSMS VSIX Extension (.NET 4.8 / Visual Studio 2022)

1. Open `SsmsExtension/SsmsExtension.csproj` in **Visual Studio 2022** (with Visual Studio Extension Development workload installed).
2. Ensure you have run `npm run build` in the root folder so that `dist/index.html` and assets exist. The `.csproj` automatically bundles all files from `..\dist\` into the `.vsix` output container.
3. Select **Release | Any CPU** and click **Build Solution**.
4. Visual Studio creates `bin\Release\SsmsPlanVisualizer.vsix`.
5. Double-click `SsmsPlanVisualizer.vsix` to install into SSMS 19 or SSMS 20, or copy the output folder to the SSMS Extensions directory:
   `%ProgramFiles(x86)%\Microsoft SQL Server Management Studio 19\Common7\IDE\Extensions\`

---

## SQL Server Prerequisites for Live DMV Polling

For live execution plan streaming, the target SQL Server instance must have:
1. **Lightweight Query Profiling (LWP):**
   - Enabled by default in **SQL Server 2019 and SQL Server 2022**.
   - For SQL Server 2016 SP1 / 2017: Enable trace flag `7412` via `DBCC TRACEON(7412, -1)` or database scoped configuration `ALTER DATABASE SCOPED CONFIGURATION SET LIGHTWEIGHT_QUERY_PROFILING = ON;`.
2. **Permissions:**
   - SQL Server 2022+: `GRANT VIEW SERVER PERFORMANCE STATE TO [User];`
   - SQL Server 2016 - 2019: `GRANT VIEW SERVER STATE TO [User];`
