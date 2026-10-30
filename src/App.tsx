import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { parseShowPlanXML } from './parser/showplanParser';
import { SAMPLE_SQLPLAN_XML } from './data/samplePlan';
import {
  ParsedPlan,
  ViewFilterMode,
  LayoutDirection,
  PlanNode,
  BottleneckScore,
} from './types/plan';
import { Toolbar } from './components/Toolbar';
import { BottleneckBar } from './components/BottleneckBar';
import { PipelineCanvas } from './components/PipelineCanvas';
import { NodeInspector } from './components/NodeInspector';
import { XmlPasteModal } from './components/XmlPasteModal';
import {
  registerHostMessageListener,
  postMessageToHost,
  isRunningInWebView2,
} from './bridge/webviewBridge';

export function App() {
  const [xmlContent, setXmlContent] = useState<string>(SAMPLE_SQLPLAN_XML);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('node');
      return p || null;
    }
    return null;
  });
  const [filterMode, setFilterMode] = useState<ViewFilterMode>(() => {
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('mode') as ViewFilterMode;
      if (m && ['all', 'heatmap', 'skew', 'focus'].includes(m)) return m;
    }
    return 'all';
  });
  const [direction, setDirection] = useState<LayoutDirection>('LR');
  const [autoCollapse, setAutoCollapse] = useState<boolean>(true);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parse ShowPlan XML into Normalized Execution Plan Tree
  const parsedPlan: ParsedPlan = useMemo(() => {
    try {
      setParseError(null);
      const plan = parseShowPlanXML(xmlContent);
      postMessageToHost({
        type: 'PLAN_LOADED',
        payload: {
          nodeCount: plan.summary.totalNodes,
          criticalCount: plan.summary.criticalCount,
          totalCPUms: plan.totalQueryCPUms,
          totalLogicalReads: plan.totalQueryLogicalReads,
        },
      });
      return plan;
    } catch (err: any) {
      const msg = err?.message || 'Failed to parse ShowPlan XML.';
      setParseError(msg);
      // Fallback to sample plan on parse error
      return parseShowPlanXML(SAMPLE_SQLPLAN_XML);
    }
  }, [xmlContent]);

  // Handle node selection
  const handleSelectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      postMessageToHost({
        type: 'NODE_SELECTED',
        payload: { nodeId },
      });
    }
  }, []);

  // Find selected node and bottleneck score
  const selectedNode: PlanNode | null = useMemo(() => {
    if (!selectedNodeId) return null;
    return parsedPlan.nodesMap.get(selectedNodeId) || null;
  }, [parsedPlan, selectedNodeId]);

  const selectedBottleneck: BottleneckScore | undefined = useMemo(() => {
    if (!selectedNodeId) return undefined;
    return parsedPlan.bottlenecks.find((b) => b.nodeId === selectedNodeId);
  }, [parsedPlan, selectedNodeId]);

  // Connect to SSMS VSIX extension via WebView2 message listener
  useEffect(() => {
    const unregister = registerHostMessageListener((msg) => {
      switch (msg.type) {
        case 'LOAD_PLAN_XML':
          if (typeof msg.payload === 'string') {
            setXmlContent(msg.payload);
            setSelectedNodeId(null);
          }
          break;
        case 'FOCUS_NODE':
          if (msg.payload?.nodeId) {
            handleSelectNode(String(msg.payload.nodeId));
          }
          break;
        case 'LIVE_PROFILE_UPDATE':
          // In live profile mode, update plan incrementally
          if (typeof msg.payload === 'string') {
            setXmlContent(msg.payload);
          }
          break;
        default:
          break;
      }
    });

    return () => unregister();
  }, [handleSelectNode]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#090b10] text-[#f1f3f9] overflow-hidden font-sans">
      {/* Top Application Toolbar */}
      <Toolbar
        plan={parsedPlan}
        filterMode={filterMode}
        onFilterModeChange={setFilterMode}
        direction={direction}
        onDirectionToggle={() =>
          setDirection((prev) => (prev === 'LR' ? 'RL' : 'LR'))
        }
        autoCollapse={autoCollapse}
        onAutoCollapseToggle={() => setAutoCollapse((prev) => !prev)}
        onLoadSample={() => {
          setXmlContent(SAMPLE_SQLPLAN_XML);
          setSelectedNodeId(null);
        }}
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        onFileUpload={(xml) => {
          setXmlContent(xml);
          setSelectedNodeId(null);
        }}
        onSelectNode={handleSelectNode}
      />

      {/* Parse Error Banner */}
      {parseError && (
        <div className="bg-critical-500/15 border-b border-critical-500/30 px-4 py-2.5 text-xs text-rose-300 flex items-center justify-between z-30 font-sans backdrop-blur-md">
          <span>{parseError} Loaded demo plan as fallback.</span>
          <button
            type="button"
            onClick={() => setParseError(null)}
            className="text-rose-400 hover:text-white underline ml-4 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* React Flow Provider Context */}
      <ReactFlowProvider>
        {/* Top 5 Bottleneck Quick Navigator */}
        <BottleneckBar
          bottlenecks={parsedPlan.bottlenecks}
          selectedNodeId={selectedNodeId || undefined}
          onSelectNode={handleSelectNode}
        />

        {/* Central Pipeline Canvas */}
        <div className="flex-1 w-full h-full relative overflow-hidden">
          <PipelineCanvas
            plan={parsedPlan}
            filterMode={filterMode}
            direction={direction}
            autoCollapse={autoCollapse}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
          />

          {/* Slide-over Node Inspector */}
          {selectedNode && (
            <NodeInspector
              node={selectedNode}
              bottleneck={selectedBottleneck}
              onClose={() => handleSelectNode(null)}
              onNavigateToNode={handleSelectNode}
            />
          )}
        </div>
      </ReactFlowProvider>

      {/* Paste XML Dialog */}
      <XmlPasteModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSubmit={(xml) => {
          setXmlContent(xml);
          setSelectedNodeId(null);
        }}
      />
    </div>
  );
}

export default App;
