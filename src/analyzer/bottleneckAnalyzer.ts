import {
  PlanNode,
  BottleneckScore,
  PlanSummary,
} from '../types/plan';

/**
 * Calculates a composite severity score (0 - 100) for prioritizing bottlenecks
 */
function calculateSeverityScore(
  trueCostPercent: number,
  skewRatio: number,
  hasSpill: boolean,
  hasConvert: boolean,
  isLookup: boolean,
  lookupExecutions: number,
  hasNoJoin: boolean
): { score: number; severity: 'CRITICAL' | 'WARNING' | 'HEALTHY'; primaryReason: string } {
  let score = 0;
  const reasons: string[] = [];

  // True Cost contribution (up to 40 pts)
  if (trueCostPercent >= 25) {
    score += Math.min(40, 25 + (trueCostPercent - 25) * 0.5);
    reasons.push(`High Operator Cost (${trueCostPercent.toFixed(1)}%)`);
  } else if (trueCostPercent >= 10) {
    score += 15 + (trueCostPercent - 10);
    reasons.push(`Elevated Cost (${trueCostPercent.toFixed(1)}%)`);
  } else {
    score += trueCostPercent * 1.5;
  }

  // TempDB Spill (instant high severity + 35 pts)
  if (hasSpill) {
    score += 35;
    reasons.push('TempDB Workfile Spill');
  }

  // Missing Join Predicate (instant high severity + 35 pts)
  if (hasNoJoin) {
    score += 35;
    reasons.push('Cartesian Product (No Join Predicate)');
  }

  // Implicit Conversion (+ 25 pts)
  if (hasConvert) {
    score += 25;
    reasons.push('Implicit Data Type Conversion');
  }

  // Cardinality Skew (+ up to 30 pts)
  const normSkew = skewRatio >= 1 ? skewRatio : 1 / Math.max(0.0001, skewRatio);
  if (normSkew > 20) {
    score += 30;
    reasons.push(`Extreme Cardinality Skew (${normSkew.toFixed(0)}x)`);
  } else if (normSkew > 5) {
    score += 18;
    reasons.push(`Cardinality Estimation Skew (${normSkew.toFixed(1)}x)`);
  }

  // Excessive Key Lookup (+ up to 25 pts)
  if (isLookup && lookupExecutions > 1000) {
    score += Math.min(25, 12 + Math.log10(lookupExecutions) * 4);
    reasons.push(`Key Lookup (${lookupExecutions.toLocaleString()} execs)`);
  }

  score = Math.min(100, Math.round(score));

  let severity: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
  if (
    trueCostPercent >= 25 ||
    hasSpill ||
    hasNoJoin ||
    (hasConvert && trueCostPercent > 5) ||
    normSkew >= 20 ||
    (isLookup && lookupExecutions > 10000)
  ) {
    severity = 'CRITICAL';
  } else if (
    trueCostPercent >= 10 ||
    normSkew >= 5 ||
    (isLookup && lookupExecutions > 100) ||
    hasConvert ||
    score >= 35
  ) {
    severity = 'WARNING';
  }

  const primaryReason = reasons[0] || (severity === 'HEALTHY' ? 'Normal Operation' : 'Pipeline Bottleneck');

  return { score, severity, primaryReason };
}

/**
 * Generates concrete, actionable DBA & T-SQL tuning advice for a given node
 */
function generateTuningAdvice(node: PlanNode, skewRatio: number): string[] {
  const recommendations: string[] = [];
  const metrics = node.actualMetrics;
  const objName = node.targetObject
    ? `[${node.targetObject.schema || 'dbo'}].[${node.targetObject.table || 'Table'}]`
    : 'target table';
  const idxName = node.targetObject?.index
    ? `[${node.targetObject.index}]`
    : 'non-clustered index';

  // TempDB Spill advice
  const spillWarning = node.warnings.find((w) => w.type === 'TEMPDB_SPILL');
  if (spillWarning) {
    recommendations.push(
      `TempDB Spill detected on ${node.physicalOp}. The query optimizer under-estimated row counts or row sizes, granting insufficient workspace memory.`
    );
    recommendations.push(
      `T-SQL Fix: Run UPDATE STATISTICS ${objName} WITH FULLSCAN. If statistics are current, test with query hint OPTION (MIN_GRANT_PERCENT = 10) or inspect memory grants via sys.dm_exec_query_memory_grants.`
    );
  }

  // Implicit Conversion advice
  const convWarning = node.warnings.find((w) => w.type === 'IMPLICIT_CONVERT');
  if (convWarning) {
    const expr = convWarning.details?.expression || 'column';
    recommendations.push(
      `Implicit Conversion (${expr}) prevents index seek on ${objName}. SQL Server is forcing a full scan because parameter and column data types do not match (e.g., VARCHAR vs NVARCHAR or INT vs BIGINT).`
    );
    recommendations.push(
      `T-SQL Fix: Change application parameter type or add an explicit CONVERT/CAST in the query to match the table column type exactly.`
    );
  }

  // Excessive Key Lookup advice
  const lookupWarning = node.warnings.find((w) => w.type === 'EXCESSIVE_LOOKUP');
  if (lookupWarning || node.logicalOp === 'Key Lookup') {
    const execs = metrics?.actualExecutions || 0;
    const cols = node.outputColumns.slice(0, 5).join(', ') || 'required columns';
    recommendations.push(
      `Key Lookup executed ${execs > 0 ? execs.toLocaleString() : 'numerous'} times. Each row found by the non-clustered index requires a secondary clustered index lookup.`
    );
    recommendations.push(
      `Index Fix: Add output columns to the existing index using INCLUDE to create a covering index: CREATE NONCLUSTERED INDEX IX_Covering ON ${objName} (...) INCLUDE (${cols}) WITH (DROP_EXISTING = ON);`
    );
  }

  // Cardinality Skew advice
  const skewWarning = node.warnings.find((w) => w.type === 'CARDINALITY_SKEW');
  if (skewWarning) {
    const normSkew = skewRatio >= 1 ? skewRatio : 1 / Math.max(0.0001, skewRatio);
    recommendations.push(
      `Massive Cardinality Skew (${normSkew.toFixed(1)}x difference). Estimated ${node.estimateRows.toLocaleString()} rows vs Actual ${metrics?.actualRows.toLocaleString()} rows.`
    );
    recommendations.push(
      `DBA Fix: Update statistics with UPDATE STATISTICS ${objName} WITH FULLSCAN, PERSIST_STALE_PERCENT = OFF. If this query uses stored procedure parameters, test for parameter sniffing with OPTION (RECOMPILE).`
    );
  }

  // Residual Predicate filter advice
  const resWarning = node.warnings.find((w) => w.type === 'RESIDUAL_PREDICATE');
  if (resWarning) {
    const predStr = node.predicates && node.predicates[0] ? `: ${node.predicates[0]}` : '';
    recommendations.push(
      `Inefficient Index Scan: The storage engine read ${metrics?.actualRowsRead.toLocaleString()} rows from disk/buffer but discarded ${((metrics?.actualRowsRead || 0) - (metrics?.actualRows || 0)).toLocaleString()} rows via residual filter${predStr}.`
    );
    recommendations.push(
      `Index Fix: Incorporate the filter predicate column(s) directly into the index key or create a Filtered Index: CREATE NONCLUSTERED INDEX IX_Filtered ON ${objName} (...) WHERE (...);`
    );
  }

  // Missing Join Predicate advice
  const noJoinWarning = node.warnings.find((w) => w.type === 'NO_JOIN_PREDICATE');
  if (noJoinWarning) {
    recommendations.push(
      `Cartesian Product: Join operator is running without a join condition, multiplying row counts exponentially.`
    );
    recommendations.push(
      `T-SQL Fix: Add explicit join predicates in the ON clause (e.g., INNER JOIN ... ON TableA.Key = TableB.Key).`
    );
  }

  // Parallel Skew advice
  const parWarning = node.warnings.find((w) => w.type === 'PARALLEL_SKEW');
  if (parWarning) {
    recommendations.push(
      `Parallel Workload Skew: Uneven row distribution across parallel threads.`
    );
    recommendations.push(
      `T-SQL Fix: Investigate the hash partitioning key or check if leading columns of the join or group-by have heavy duplicate values.`
    );
  }

  // High CPU cost general advice
  if (metrics && metrics.trueCostPercent > 30 && recommendations.length === 0) {
    recommendations.push(
      `Heavy CPU/IO Operator: This operator consumes ${metrics.trueCostPercent.toFixed(1)}% of total query runtime with ${metrics.actualLogicalReads.toLocaleString()} logical reads.`
    );
    if (node.physicalOp.includes('Scan')) {
      recommendations.push(
        `Index Fix: Table or Clustered Index scan on ${objName}. Check WHERE clauses to add a selective B-Tree index.`
      );
    } else if (node.physicalOp.includes('Sort')) {
      recommendations.push(
        `T-SQL Fix: Sort operator required by ORDER BY or GROUP BY. Create an index pre-sorted by the ORDER BY columns to eliminate explicit sorting.`
      );
    }
  }

  return recommendations;
}

/**
 * Analyzes parsed plan nodes, scores bottlenecks, and counts summary statistics
 */
export function analyzeBottlenecks(
  root: PlanNode,
  nodesMap: Map<string, PlanNode>,
  isActualPlan: boolean
): {
  bottlenecks: BottleneckScore[];
  summary: PlanSummary;
} {
  const bottlenecks: BottleneckScore[] = [];
  let criticalCount = 0;
  let warningCount = 0;
  let healthyCount = 0;
  let spillsCount = 0;
  let implicitConvertsCount = 0;
  let maxSkewRatio = 1.0;

  for (const node of nodesMap.values()) {
    const metrics = node.actualMetrics;
    const estRows = Math.max(1, node.estimateRows);
    const actRows = isActualPlan && metrics ? metrics.actualRows : estRows;
    const skewRatio = actRows / estRows;
    const normSkew = skewRatio >= 1 ? skewRatio : 1 / Math.max(0.0001, skewRatio);

    if (normSkew > maxSkewRatio && Math.abs(actRows - estRows) > 100) {
      maxSkewRatio = normSkew;
    }

    const hasSpill = node.warnings.some((w) => w.type === 'TEMPDB_SPILL');
    const hasConvert = node.warnings.some((w) => w.type === 'IMPLICIT_CONVERT');
    const hasNoJoin = node.warnings.some((w) => w.type === 'NO_JOIN_PREDICATE');
    const isLookup =
      node.logicalOp.toLowerCase().includes('lookup') ||
      node.physicalOp.toLowerCase().includes('lookup');
    const lookupExecs = metrics ? metrics.actualExecutions : 0;

    if (hasSpill) spillsCount++;
    if (hasConvert) implicitConvertsCount++;

    const costPct = isActualPlan && metrics
      ? metrics.trueCostPercent
      : (metrics?.estimatedCostPercent || 0);

    const { score, severity, primaryReason } = calculateSeverityScore(
      costPct,
      skewRatio,
      hasSpill,
      hasConvert,
      isLookup,
      lookupExecs,
      hasNoJoin
    );

    if (severity === 'CRITICAL') criticalCount++;
    else if (severity === 'WARNING') warningCount++;
    else healthyCount++;

    const recommendations = generateTuningAdvice(node, skewRatio);

    const targetStr = node.targetObject
      ? `${node.targetObject.table || ''}${node.targetObject.index ? '.' + node.targetObject.index : ''}`
      : undefined;

    bottlenecks.push({
      nodeId: node.id,
      physicalOp: node.physicalOp,
      logicalOp: node.logicalOp,
      targetObject: targetStr,
      severity,
      trueCostPercent: costPct,
      skewRatio,
      score,
      primaryReason,
      recommendations,
      metricsSummary: {
        actualRows: actRows,
        estimateRows: node.estimateRows,
        actualCPUms: metrics?.actualCPUms || 0,
        actualLogicalReads: metrics?.actualLogicalReads || 0,
        actualExecutions: metrics?.actualExecutions || 1,
      },
    });
  }

  // Sort bottlenecks by score descending
  bottlenecks.sort((a, b) => b.score - a.score);

  // Compute tree depth
  function getDepth(n: PlanNode): number {
    if (!n.children || n.children.length === 0) return 1;
    return 1 + Math.max(...n.children.map(getDepth));
  }
  const maxDepth = getDepth(root);

  return {
    bottlenecks,
    summary: {
      totalNodes: nodesMap.size,
      criticalCount,
      warningCount,
      healthyCount,
      maxDepth,
      spillsCount,
      implicitConvertsCount,
      maxSkewRatio: Math.round(maxSkewRatio * 10) / 10,
      totalActualRows: 0,
    },
  };
}

/**
 * Checks if a subtree rooted at node is completely healthy, has >= 3 nodes, and cumulative cost < 2%
 */
export function canCollapseSubtree(
  node: PlanNode,
  bottleneckMap: Map<string, BottleneckScore>
): { canCollapse: boolean; nodeCount: number; cumulativeCost: number; nodeIds: string[] } {
  let count = 0;
  let totalCost = 0;
  let allHealthy = true;
  const nodeIds: string[] = [];

  function check(n: PlanNode) {
    count++;
    nodeIds.push(n.id);
    const b = bottleneckMap.get(n.id);
    if (!b || b.severity !== 'HEALTHY') {
      allHealthy = false;
    }
    const cost = n.actualMetrics?.trueCostPercent || n.actualMetrics?.estimatedCostPercent || 0;
    totalCost += cost;

    for (const child of n.children) {
      check(child);
    }
  }

  check(node);

  const canCollapse = allHealthy && count >= 3 && totalCost <= 2.5;
  return { canCollapse, nodeCount: count, cumulativeCost: totalCost, nodeIds };
}
