import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react';
import dagre from 'dagre';
import { OperatorNode } from './nodes/OperatorNode';
import { CollapsedSubtreeNode } from './nodes/CollapsedSubtreeNode';
import { DataFlowEdge } from './edges/DataFlowEdge';
import {
  ParsedPlan,
  PlanNode,
  ViewFilterMode,
  LayoutDirection,
  BottleneckScore,
} from '../types/plan';
import { canCollapseSubtree } from '../analyzer/bottleneckAnalyzer';

const nodeTypes = {
  operatorNode: OperatorNode,
  collapsedSubtree: CollapsedSubtreeNode,
};

const edgeTypes = {
  dataFlowEdge: DataFlowEdge,
};

interface PipelineCanvasProps {
  plan: ParsedPlan;
  filterMode: ViewFilterMode;
  direction: LayoutDirection;
  autoCollapse: boolean;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
}

const NODE_WIDTH = 310;
const NODE_HEIGHT = 200;
const COLLAPSED_WIDTH = 260;
const COLLAPSED_HEIGHT = 100;

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  plan,
  filterMode,
  direction,
  autoCollapse,
  selectedNodeId,
  onSelectNode,
}) => {
  const { fitView } = useReactFlow();

  // Track user-expanded subtree roots so they aren't auto-collapsed
  const [expandedSubtreeIds, setExpandedSubtreeIds] = useState<Set<string>>(new Set());

  const handleExpandSubtree = useCallback((subtreeRootId: string) => {
    setExpandedSubtreeIds((prev) => {
      const next = new Set(prev);
      next.add(subtreeRootId);
      return next;
    });
  }, []);

  // Map of bottleneck scores by nodeId
  const bottleneckMap = useMemo(() => {
    const map = new Map<string, BottleneckScore>();
    for (const b of plan.bottlenecks) {
      map.set(b.nodeId, b);
    }
    return map;
  }, [plan.bottlenecks]);

  // Compute Layout & Flow Graph
  const { initialNodes, initialEdges } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: direction,
      nodesep: 50,
      ranksep: 90,
      marginx: 40,
      marginy: 40,
    });
    g.setDefaultEdgeLabel(() => ({}));

    const nodesList: Node[] = [];
    const edgesList: Edge[] = [];
    const hiddenNodeIds = new Set<string>();

    // 1. Identify healthy subtrees for auto-collapse if enabled
    const collapsedSubtreeRoots = new Map<
      string,
      { count: number; cost: number; nodeIds: string[] }
    >();

    if (autoCollapse) {
      function findCollapsible(node: PlanNode) {
        if (!expandedSubtreeIds.has(node.id)) {
          const check = canCollapseSubtree(node, bottleneckMap);
          if (check.canCollapse) {
            collapsedSubtreeRoots.set(node.id, {
              count: check.nodeCount,
              cost: check.cumulativeCost,
              nodeIds: check.nodeIds,
            });
            for (const id of check.nodeIds) {
              if (id !== node.id) {
                hiddenNodeIds.add(id);
              }
            }
            return;
          }
        }

        for (const child of node.children) {
          findCollapsible(child);
        }
      }

      findCollapsible(plan.root);
    }

    // 2. Build nodes & edges
    function traverse(node: PlanNode) {
      if (hiddenNodeIds.has(node.id)) return;

      const isSubtreeCollapsed = collapsedSubtreeRoots.has(node.id);

      if (isSubtreeCollapsed) {
        const sub = collapsedSubtreeRoots.get(node.id)!;
        g.setNode(node.id, { width: COLLAPSED_WIDTH, height: COLLAPSED_HEIGHT });
        nodesList.push({
          id: node.id,
          type: 'collapsedSubtree',
          position: { x: 0, y: 0 },
          data: {
            id: node.id,
            nodeCount: sub.count,
            cumulativeCost: sub.cost,
            direction,
            onExpand: handleExpandSubtree,
          },
        });
        return;
      }

      // Normal Operator Node
      g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
      nodesList.push({
        id: node.id,
        type: 'operatorNode',
        position: { x: 0, y: 0 },
        data: {
          node,
          bottleneck: bottleneckMap.get(node.id),
          filterMode,
          direction,
          isSelected: selectedNodeId === node.id,
        },
      });

      // Recurse children
      for (const child of node.children) {
        if (!hiddenNodeIds.has(child.id)) {
          const edgeId = `e-${child.id}-${node.id}`;
          g.setEdge(child.id, node.id);

          const childActRows = child.actualMetrics?.actualRows ?? 0;
          const childEstRows = Math.max(1, child.estimateRows);
          const skewRatio = childActRows / childEstRows;
          const normSkew = skewRatio >= 1 ? skewRatio : 1 / Math.max(0.0001, skewRatio);
          const isSkewed = normSkew >= 5 && Math.abs(childActRows - childEstRows) > 500;
          const isCriticalSkew = normSkew >= 20 && Math.abs(childActRows - childEstRows) > 1000;

          edgesList.push({
            id: edgeId,
            source: child.id,
            target: node.id,
            type: 'dataFlowEdge',
            data: {
              actualRows: childActRows,
              estimateRows: childEstRows,
              executions: child.actualMetrics?.actualExecutions || 1,
              isSkewed,
              isCriticalSkew,
            },
          });
        }
        traverse(child);
      }
    }

    traverse(plan.root);

    // Run dagre layout algorithm
    dagre.layout(g);

    // Apply calculated coordinates
    const layoutedNodes = nodesList.map((n) => {
      const nodeWithPos = g.node(n.id);
      const w = n.type === 'collapsedSubtree' ? COLLAPSED_WIDTH : NODE_WIDTH;
      const h = n.type === 'collapsedSubtree' ? COLLAPSED_HEIGHT : NODE_HEIGHT;

      return {
        ...n,
        position: {
          x: nodeWithPos.x - w / 2,
          y: nodeWithPos.y - h / 2,
        },
      };
    });

    return { initialNodes: layoutedNodes, initialEdges: edgesList };
  }, [
    plan,
    filterMode,
    direction,
    autoCollapse,
    expandedSubtreeIds,
    bottleneckMap,
    selectedNodeId,
    handleExpandSubtree,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state whenever layout or filters change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Initial fit view
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ duration: 500, padding: 0.15 });
    }, 100);
    return () => clearTimeout(timer);
  }, [fitView, direction, autoCollapse]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'operatorNode') {
        onSelectNode(node.id);
      }
    },
    [onSelectNode]
  );

  const onPaneClick = useCallback(() => {
    onSelectNode(null);
  }, [onSelectNode]);

  return (
    <div className="flex-1 w-full h-full relative bg-[#090b10]">
      {/* Large plan notification */}
      {plan.summary.totalNodes > 80 && (
        <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-[#10141f]/90 border border-white/[0.08] text-xs text-slate-300 shadow-lg font-sans backdrop-blur-md">
          Large execution plan ({plan.summary.totalNodes} operators). Healthy subtrees have been auto-collapsed.
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        minZoom={0.15}
        maxZoom={2.0}
        defaultEdgeOptions={{ type: 'dataFlowEdge' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="#1a2233"
        />

        <Controls
          className="!bg-[#10141f] !border-white/[0.08] !rounded-xl !shadow-card !fill-slate-300"
          showInteractive={false}
        />

        <MiniMap
          nodeStrokeColor="#3b82f6"
          nodeColor={(n) => {
            if (n.type === 'collapsedSubtree') return '#10b981';
            const b = bottleneckMap.get(n.id);
            if (b?.severity === 'CRITICAL') return '#f43f5e';
            if (b?.severity === 'WARNING') return '#f59e0b';
            return '#1e2638';
          }}
          nodeBorderRadius={4}
          className="!bg-[#0c0e15] !border-white/[0.08] !rounded-xl !shadow-card overflow-hidden"
          maskColor="rgba(9, 11, 16, 0.85)"
        />
      </ReactFlow>
    </div>
  );
};
