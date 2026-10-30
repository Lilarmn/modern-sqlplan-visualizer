export interface TargetObject {
  database?: string;
  schema?: string;
  table?: string;
  index?: string;
  alias?: string;
  indexKind?: string;
  storage?: string;
}

export interface ThreadMetric {
  threadId: number;
  actualRows: number;
  actualRowsRead: number;
  actualExecutions: number;
  actualCPUms: number;
  actualElapsedms: number;
  actualLogicalReads: number;
  actualPhysicalReads: number;
}

export interface RuntimeMetrics {
  actualRows: number;
  actualRowsRead: number;
  actualExecutions: number;
  actualRebinds: number;
  actualRewinds: number;
  actualLogicalReads: number;
  actualPhysicalReads: number;
  actualReadAheads: number;
  actualCPUms: number;
  actualElapsedms: number;
  exclusiveCPUms: number;
  exclusiveElapsedms: number;
  exclusiveLogicalReads: number;
  trueCostPercent: number;
  estimatedCostPercent: number;
  threads: ThreadMetric[];
}

export type WarningType =
  | 'TEMPDB_SPILL'
  | 'IMPLICIT_CONVERT'
  | 'NO_JOIN_PREDICATE'
  | 'EXCESSIVE_LOOKUP'
  | 'MEMORY_GRANT'
  | 'CARDINALITY_SKEW'
  | 'PARALLEL_SKEW'
  | 'RESIDUAL_PREDICATE';

export interface PlanWarning {
  type: WarningType;
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  message: string;
  details?: Record<string, any>;
}

export interface PlanNode {
  id: string; // usually NodeId as string
  nodeId: number;
  physicalOp: string;
  logicalOp: string;
  estimateRows: number;
  estimateIO: number;
  estimateCPU: number;
  estimateRebinds: number;
  estimateRewinds: number;
  estimatedTotalSubtreeCost: number;
  targetObject?: TargetObject;
  outputColumns: string[];
  seekPredicates?: string[];
  predicates?: string[];
  hashKeysBuild?: string[];
  hashKeysProbe?: string[];
  warnings: PlanWarning[];
  actualMetrics?: RuntimeMetrics;
  children: PlanNode[];
  parentId?: string;
  parallel: boolean;
  statementText?: string;
  statementType?: string;
  statementSubTreeCost?: number;
  isCollapsedSubtree?: boolean;
  collapsedNodeCount?: number;
  collapsedSubtreeCost?: number;
  collapsedNodeIds?: string[];
  collapsedChildren?: PlanNode[];
}

export interface BottleneckScore {
  nodeId: string;
  physicalOp: string;
  logicalOp: string;
  targetObject?: string;
  severity: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  trueCostPercent: number;
  skewRatio: number;
  score: number; // 0 - 100
  primaryReason: string;
  recommendations: string[];
  metricsSummary: {
    actualRows: number;
    estimateRows: number;
    actualCPUms: number;
    actualLogicalReads: number;
    actualExecutions: number;
  };
}

export interface PlanSummary {
  totalNodes: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
  maxDepth: number;
  spillsCount: number;
  implicitConvertsCount: number;
  maxSkewRatio: number;
  totalActualRows: number;
}

export interface ParsedPlan {
  root: PlanNode;
  nodesMap: Map<string, PlanNode>;
  totalQueryCPUms: number;
  totalQueryLogicalReads: number;
  totalQueryElapsedms: number;
  totalSubtreeCost: number;
  queryText: string;
  isActualPlan: boolean;
  bottlenecks: BottleneckScore[];
  summary: PlanSummary;
}

export type ViewFilterMode =
  | 'all'
  | 'heatmap'
  | 'skew'
  | 'focus';

export type LayoutDirection = 'LR' | 'RL' | 'TB';
