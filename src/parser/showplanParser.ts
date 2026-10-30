import {
  PlanNode,
  ParsedPlan,
  RuntimeMetrics,
  ThreadMetric,
  PlanWarning,
  TargetObject,
  PlanSummary,
} from '../types/plan';
import { analyzeBottlenecks } from '../analyzer/bottleneckAnalyzer';

/**
 * Finds immediate child <RelOp> elements of a parent <RelOp>,
 * ensuring we don't skip intermediate hierarchy or grab grandchildren.
 */
function findImmediateChildRelOps(parentEl: Element): Element[] {
  const result: Element[] = [];

  function traverse(el: Element) {
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      const localName = child.localName || child.nodeName;
      if (localName === 'RelOp') {
        result.push(child);
      } else {
        traverse(child);
      }
    }
  }

  // Traverse direct children of parent (skip parent itself)
  for (let i = 0; i < parentEl.children.length; i++) {
    const child = parentEl.children[i];
    const localName = child.localName || child.nodeName;
    if (localName === 'RelOp') {
      result.push(child);
    } else {
      traverse(child);
    }
  }

  return result;
}

/**
 * Normalizes CPU/Elapsed time from SQL Server showplan counters.
 * In SQL Server 2012+ showplans, ActualCPU is in microseconds.
 */
function normalizeTimeMs(val: number): number {
  if (!val || val <= 0) return 0;
  // If value is greater than 10,000, it is almost certainly microseconds
  if (val > 1000) {
    return Math.round((val / 1000) * 100) / 100;
  }
  return Math.round(val * 100) / 100;
}

/**
 * Extracts target object details from an operator element
 */
function extractTargetObject(relOpEl: Element): TargetObject | undefined {
  // Look for <Object> tags inside this RelOp (excluding child RelOps)
  const objectEls = relOpEl.getElementsByTagName('Object');
  for (let i = 0; i < objectEls.length; i++) {
    const objEl = objectEls[i];
    // Verify it belongs to this RelOp and not a child RelOp
    let p = objEl.parentElement;
    let belongsToThisRelOp = true;
    while (p && p !== relOpEl) {
      if ((p.localName || p.nodeName) === 'RelOp') {
        belongsToThisRelOp = false;
        break;
      }
      p = p.parentElement;
    }

    if (belongsToThisRelOp) {
      const db = objEl.getAttribute('Database')?.replace(/[[\]]/g, '') || undefined;
      const schema = objEl.getAttribute('Schema')?.replace(/[[\]]/g, '') || undefined;
      const table = objEl.getAttribute('Table')?.replace(/[[\]]/g, '') || undefined;
      const index = objEl.getAttribute('Index')?.replace(/[[\]]/g, '') || undefined;
      const alias = objEl.getAttribute('Alias')?.replace(/[[\]]/g, '') || undefined;
      const indexKind = objEl.getAttribute('IndexKind') || undefined;
      const storage = objEl.getAttribute('Storage') || undefined;

      if (table || index || alias) {
        return {
          database: db,
          schema: schema,
          table: table,
          index: index,
          alias: alias,
          indexKind: indexKind,
          storage: storage,
        };
      }
    }
  }
  return undefined;
}

/**
 * Extracts runtime counters per thread
 */
function extractRuntimeMetrics(relOpEl: Element): RuntimeMetrics | undefined {
  const runtimeInfoEl = Array.from(relOpEl.children).find(
    (c) => (c.localName || c.nodeName) === 'RunTimeInformation'
  );

  if (!runtimeInfoEl) {
    // Check nested under other children just in case
    const nested = relOpEl.getElementsByTagName('RunTimeInformation');
    if (nested.length === 0) return undefined;
  }

  const threadEls = relOpEl.getElementsByTagName('RunTimeCountersPerThread');
  if (threadEls.length === 0) return undefined;

  const threads: ThreadMetric[] = [];
  let sumRows = 0;
  let sumRowsRead = 0;
  let sumExecutions = 0;
  let sumRebinds = 0;
  let sumRewinds = 0;
  let sumLogicalReads = 0;
  let sumPhysicalReads = 0;
  let sumReadAheads = 0;
  let sumCPU = 0;
  let maxElapsed = 0;

  for (let i = 0; i < threadEls.length; i++) {
    const tEl = threadEls[i];
    // Check that this counter belongs to this relOp
    let p = tEl.parentElement;
    let belongs = true;
    while (p && p !== relOpEl) {
      if ((p.localName || p.nodeName) === 'RelOp') {
        belongs = false;
        break;
      }
      p = p.parentElement;
    }
    if (!belongs) continue;

    const threadId = parseInt(tEl.getAttribute('Thread') || '0', 10);
    const actualRows = parseInt(tEl.getAttribute('ActualRows') || '0', 10);
    const actualRowsRead = parseInt(tEl.getAttribute('ActualRowsRead') || '0', 10);
    const actualExecutions = parseInt(tEl.getAttribute('ActualExecutions') || '1', 10);
    const actualRebinds = parseInt(tEl.getAttribute('ActualRebinds') || '0', 10);
    const actualRewinds = parseInt(tEl.getAttribute('ActualRewinds') || '0', 10);
    const actualLogicalReads = parseInt(tEl.getAttribute('ActualLogicalReads') || '0', 10);
    const actualPhysicalReads = parseInt(tEl.getAttribute('ActualPhysicalReads') || '0', 10);
    const actualReadAheads = parseInt(tEl.getAttribute('ActualReadAheads') || '0', 10);

    const rawCPU = parseFloat(tEl.getAttribute('ActualCPU') || '0');
    const rawElapsed = parseFloat(tEl.getAttribute('ActualElapsed') || '0');

    const cpuMs = normalizeTimeMs(rawCPU);
    const elapsedMs = normalizeTimeMs(rawElapsed);

    threads.push({
      threadId,
      actualRows,
      actualRowsRead: actualRowsRead || actualRows,
      actualExecutions,
      actualCPUms: cpuMs,
      actualElapsedms: elapsedMs,
      actualLogicalReads,
      actualPhysicalReads,
    });

    sumRows += actualRows;
    sumRowsRead += actualRowsRead || actualRows;
    sumExecutions += actualExecutions;
    sumRebinds += actualRebinds;
    sumRewinds += actualRewinds;
    sumLogicalReads += actualLogicalReads;
    sumPhysicalReads += actualPhysicalReads;
    sumReadAheads += actualReadAheads;
    sumCPU += cpuMs;
    if (elapsedMs > maxElapsed) {
      maxElapsed = elapsedMs;
    }
  }

  return {
    actualRows: sumRows,
    actualRowsRead: sumRowsRead,
    actualExecutions: sumExecutions || 1,
    actualRebinds: sumRebinds,
    actualRewinds: sumRewinds,
    actualLogicalReads: sumLogicalReads,
    actualPhysicalReads: sumPhysicalReads,
    actualReadAheads: sumReadAheads,
    actualCPUms: sumCPU,
    actualElapsedms: maxElapsed,
    exclusiveCPUms: sumCPU, // calculated later in post-pass
    exclusiveElapsedms: maxElapsed,
    exclusiveLogicalReads: sumLogicalReads, // calculated later
    trueCostPercent: 0,
    estimatedCostPercent: 0,
    threads,
  };
}

/**
 * Extracts output columns from <OutputList>
 */
function extractOutputColumns(relOpEl: Element): string[] {
  const output: string[] = [];
  const colRefs = relOpEl.getElementsByTagName('ColumnReference');
  for (let i = 0; i < colRefs.length; i++) {
    const col = colRefs[i];
    // Check if inside OutputList
    let parent = col.parentElement;
    while (parent && parent !== relOpEl) {
      if ((parent.localName || parent.nodeName) === 'OutputList') {
        const colName = col.getAttribute('Column');
        if (colName && !output.includes(colName)) {
          output.push(colName);
        }
        break;
      }
      parent = parent.parentElement;
    }
  }
  return output;
}

/**
 * Extracts Seek and Filter predicates
 */
function extractPredicates(relOpEl: Element): {
  seekPredicates: string[];
  predicates: string[];
  hashKeysBuild: string[];
  hashKeysProbe: string[];
} {
  const seekPredicates: string[] = [];
  const predicates: string[] = [];
  const hashKeysBuild: string[] = [];
  const hashKeysProbe: string[] = [];

  // Seek predicates
  const seekKeys = relOpEl.getElementsByTagName('SeekKeys');
  for (let i = 0; i < seekKeys.length; i++) {
    const key = seekKeys[i];
    const scalarStrings = key.getElementsByTagName('ScalarOperator');
    for (let j = 0; j < scalarStrings.length; j++) {
      const str = scalarStrings[j].getAttribute('ScalarString');
      if (str && !seekPredicates.includes(str)) {
        seekPredicates.push(str);
      }
    }
  }

  // Filter predicates
  const predEls = relOpEl.getElementsByTagName('Predicate');
  for (let i = 0; i < predEls.length; i++) {
    const p = predEls[i];
    // Ensure it belongs directly to this RelOp
    let parent = p.parentElement;
    let belongs = true;
    while (parent && parent !== relOpEl) {
      if ((parent.localName || parent.nodeName) === 'RelOp') {
        belongs = false;
        break;
      }
      parent = parent.parentElement;
    }
    if (belongs) {
      const scalar = p.getElementsByTagName('ScalarOperator')[0];
      const str = scalar?.getAttribute('ScalarString') || p.textContent?.trim();
      if (str && !predicates.includes(str)) {
        predicates.push(str);
      }
    }
  }

  // Hash keys
  const hashBuilds = relOpEl.getElementsByTagName('HashKeysBuild');
  for (let i = 0; i < hashBuilds.length; i++) {
    const cols = hashBuilds[i].getElementsByTagName('ColumnReference');
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j].getAttribute('Column');
      if (col) hashKeysBuild.push(col);
    }
  }

  const hashProbes = relOpEl.getElementsByTagName('HashKeysProbe');
  for (let i = 0; i < hashProbes.length; i++) {
    const cols = hashProbes[i].getElementsByTagName('ColumnReference');
    for (let j = 0; j < cols.length; j++) {
      const col = cols[j].getAttribute('Column');
      if (col) hashKeysProbe.push(col);
    }
  }

  return { seekPredicates, predicates, hashKeysBuild, hashKeysProbe };
}

/**
 * Extracts and classifies node warnings
 */
function extractWarnings(
  relOpEl: Element,
  physicalOp: string,
  logicalOp: string,
  actualMetrics?: RuntimeMetrics,
  estimateRows = 1
): PlanWarning[] {
  const warnings: PlanWarning[] = [];

  // Check for <SpillToTempDb>
  const spills = relOpEl.getElementsByTagName('SpillToTempDb');
  for (let i = 0; i < spills.length; i++) {
    const spill = spills[i];
    const level = spill.getAttribute('SpillLevel') || '1';
    const threads = spill.getAttribute('SpilledThreadCount') || 'All';
    warnings.push({
      type: 'TEMPDB_SPILL',
      severity: 'CRITICAL',
      title: 'TempDB Workfile Spill',
      message: `Operator spilled to TempDB at level ${level} across ${threads} thread(s). Insufficient memory grant.`,
      details: { spillLevel: level, spilledThreadCount: threads },
    });
  }

  // Check for <PlanAffectingConvert> (Implicit Conversion)
  const converts = relOpEl.getElementsByTagName('PlanAffectingConvert');
  for (let i = 0; i < converts.length; i++) {
    const conv = converts[i];
    const issue = conv.getAttribute('ConvertIssue') || 'SeekPlan';
    const expr = conv.getAttribute('Expression') || '';
    const isCritical =
      issue === 'SeekPlan' ||
      (actualMetrics && actualMetrics.actualRowsRead > 10000) ||
      estimateRows > 10000;

    warnings.push({
      type: 'IMPLICIT_CONVERT',
      severity: isCritical ? 'CRITICAL' : 'WARNING',
      title: 'Implicit Conversion Affecting Cardinality / Seek',
      message: `Type conversion (${issue}) on expression: ${expr || 'column expression'}. Prevents index seek.`,
      details: { issue, expression: expr },
    });
  }

  // Check for <NoJoinPredicate>
  const noJoin = relOpEl.getElementsByTagName('NoJoinPredicate');
  if (noJoin.length > 0) {
    warnings.push({
      type: 'NO_JOIN_PREDICATE',
      severity: 'CRITICAL',
      title: 'Missing Join Predicate (Cartesian Product)',
      message: 'Join operator has no join predicate, creating a full Cartesian product.',
    });
  }

  // Check for Excessive Key Lookup / RID Lookup
  const isLookup =
    logicalOp.toLowerCase().includes('lookup') ||
    physicalOp.toLowerCase().includes('lookup') ||
    relOpEl.getAttribute('Lookup') === '1' ||
    relOpEl.getElementsByTagName('IndexScan')[0]?.getAttribute('Lookup') === '1';

  if (isLookup) {
    const execs = actualMetrics ? actualMetrics.actualExecutions : estimateRows;
    if (execs > 1000) {
      warnings.push({
        type: 'EXCESSIVE_LOOKUP',
        severity: execs > 10000 ? 'CRITICAL' : 'WARNING',
        title: 'Excessive Key / RID Lookups',
        message: `Lookup executed ${execs.toLocaleString()} times. Non-clustered index is non-covering.`,
        details: { executions: execs },
      });
    }
  }

  // Check for Cardinality Estimation Skew
  if (actualMetrics && actualMetrics.actualRows !== undefined) {
    const actual = actualMetrics.actualRows;
    const est = Math.max(1, estimateRows);
    const skew = actual / est;
    const absDiff = Math.abs(actual - est);

    if ((skew > 10 || skew < 0.1) && absDiff > 1000) {
      warnings.push({
        type: 'CARDINALITY_SKEW',
        severity: skew > 20 || skew < 0.05 ? 'CRITICAL' : 'WARNING',
        title: 'Severe Cardinality Estimation Skew',
        message: `Estimated ${est.toLocaleString()} rows vs Actual ${actual.toLocaleString()} rows (${skew > 1 ? `${Math.round(skew)}x under-estimate` : `${Math.round(1 / skew)}x over-estimate`}).`,
        details: { actualRows: actual, estimateRows: est, skewRatio: skew },
      });
    }
  }

  // Check for Parallel Skew
  if (actualMetrics && actualMetrics.threads.length > 1) {
    const totalRows = actualMetrics.actualRows;
    if (totalRows > 1000) {
      const maxThreadRows = Math.max(...actualMetrics.threads.map((t) => t.actualRows));
      const threadRatio = maxThreadRows / totalRows;
      if (threadRatio > 0.75) {
        warnings.push({
          type: 'PARALLEL_SKEW',
          severity: 'WARNING',
          title: 'Parallel Thread Distribution Skew',
          message: `Single thread processed ${(threadRatio * 100).toFixed(0)}% of all rows (${maxThreadRows.toLocaleString()} rows). Uneven partitioning.`,
          details: { threadRatio, maxThreadRows, totalRows },
        });
      }
    }
  }

  // Check for Residual Predicate (High rows read to rows returned)
  if (actualMetrics && actualMetrics.actualRowsRead > actualMetrics.actualRows * 5 && actualMetrics.actualRowsRead > 5000) {
    const discarded = actualMetrics.actualRowsRead - actualMetrics.actualRows;
    const discardPct = ((discarded / actualMetrics.actualRowsRead) * 100).toFixed(1);
    warnings.push({
      type: 'RESIDUAL_PREDICATE',
      severity: 'WARNING',
      title: 'High Rows Read vs Returned (Residual Predicate Filter)',
      message: `Read ${actualMetrics.actualRowsRead.toLocaleString()} rows but returned only ${actualMetrics.actualRows.toLocaleString()} rows (${discardPct}% discarded by filter predicate).`,
      details: {
        actualRowsRead: actualMetrics.actualRowsRead,
        actualRows: actualMetrics.actualRows,
        discardPercent: discardPct,
      },
    });
  }

  return warnings;
}

/**
 * Recursively parses a <RelOp> element and builds a PlanNode tree
 */
function parseRelOp(
  relOpEl: Element,
  nodesMap: Map<string, PlanNode>,
  parentId?: string
): PlanNode {
  const nodeIdStr = relOpEl.getAttribute('NodeId') || '0';
  const nodeId = parseInt(nodeIdStr, 10);
  const physicalOp = relOpEl.getAttribute('PhysicalOp') || 'Operator';
  const logicalOp = relOpEl.getAttribute('LogicalOp') || physicalOp;
  const estimateRows = parseFloat(relOpEl.getAttribute('EstimateRows') || '1');
  const estimateIO = parseFloat(relOpEl.getAttribute('EstimateIO') || '0');
  const estimateCPU = parseFloat(relOpEl.getAttribute('EstimateCPU') || '0');
  const estimateRebinds = parseFloat(relOpEl.getAttribute('EstimateRebinds') || '0');
  const estimateRewinds = parseFloat(relOpEl.getAttribute('EstimateRewinds') || '0');
  const estimatedTotalSubtreeCost = parseFloat(
    relOpEl.getAttribute('EstimatedTotalSubtreeCost') || '0'
  );
  const parallel = relOpEl.getAttribute('Parallel') === '1';

  const targetObject = extractTargetObject(relOpEl);
  const outputColumns = extractOutputColumns(relOpEl);
  const { seekPredicates, predicates, hashKeysBuild, hashKeysProbe } =
    extractPredicates(relOpEl);
  const actualMetrics = extractRuntimeMetrics(relOpEl);
  const warnings = extractWarnings(
    relOpEl,
    physicalOp,
    logicalOp,
    actualMetrics,
    estimateRows
  );

  const planNode: PlanNode = {
    id: nodeIdStr,
    nodeId,
    physicalOp,
    logicalOp,
    estimateRows,
    estimateIO,
    estimateCPU,
    estimateRebinds,
    estimateRewinds,
    estimatedTotalSubtreeCost,
    targetObject,
    outputColumns,
    seekPredicates,
    predicates,
    hashKeysBuild,
    hashKeysProbe,
    warnings,
    actualMetrics,
    children: [],
    parentId,
    parallel,
  };

  nodesMap.set(nodeIdStr, planNode);

  // Parse immediate children
  const childEls = findImmediateChildRelOps(relOpEl);
  for (const childEl of childEls) {
    const childNode = parseRelOp(childEl, nodesMap, nodeIdStr);
    planNode.children.push(childNode);
  }

  return planNode;
}

/**
 * Calculates Exclusive CPU, Logical Reads, and Elapsed time across the tree.
 * In execution plans, child operators feed into parent operators.
 * Non-blocking streaming operators run concurrently, while blocking operators wait for children.
 */
function computeExclusiveMetrics(root: PlanNode, isActual: boolean) {
  function traverse(node: PlanNode) {
    for (const child of node.children) {
      traverse(child);
    }

    if (isActual && node.actualMetrics) {
      let childSumCPU = 0;
      let childSumReads = 0;
      let childMaxElapsed = 0;

      for (const child of node.children) {
        if (child.actualMetrics) {
          childSumCPU += child.actualMetrics.actualCPUms;
          childSumReads += child.actualMetrics.actualLogicalReads;
          if (child.actualMetrics.actualElapsedms > childMaxElapsed) {
            childMaxElapsed = child.actualMetrics.actualElapsedms;
          }
        }
      }

      // Exclusive CPU = Node CPU minus Children CPU
      node.actualMetrics.exclusiveCPUms = Math.max(
        0,
        Math.round((node.actualMetrics.actualCPUms - childSumCPU) * 100) / 100
      );

      // Exclusive Reads = Node Reads minus Children Reads
      node.actualMetrics.exclusiveLogicalReads = Math.max(
        0,
        node.actualMetrics.actualLogicalReads - childSumReads
      );

      // Exclusive Elapsed
      node.actualMetrics.exclusiveElapsedms = Math.max(
        0,
        Math.round((node.actualMetrics.actualElapsedms - childMaxElapsed) * 100) / 100
      );
    }
  }

  traverse(root);
}

/**
 * Main parser entry point: takes raw ShowPlan XML string and returns ParsedPlan
 */
export function parseShowPlanXML(xmlString: string): ParsedPlan {
  if (!xmlString || !xmlString.trim()) {
    throw new Error('ShowPlan XML string is empty.');
  }

  const domParser = new DOMParser();
  const xmlDoc = domParser.parseFromString(xmlString, 'text/xml');

  // Check for XML parsing error
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error(`XML parsing error: ${parseError[0].textContent || 'Invalid XML format'}`);
  }

  // Extract Query text if available
  let queryText = '';
  const stmtSimple = xmlDoc.getElementsByTagName('StmtSimple')[0];
  if (stmtSimple) {
    queryText = stmtSimple.getAttribute('StatementText') || '';
  }

  // Find root <RelOp>
  const relOps = xmlDoc.getElementsByTagName('RelOp');
  if (relOps.length === 0) {
    throw new Error('No <RelOp> execution plan operators found in XML.');
  }

  const rootRelOp = relOps[0];
  const nodesMap = new Map<string, PlanNode>();

  const root = parseRelOp(rootRelOp, nodesMap);

  // Check if this plan has actual runtime information
  const runtimeInfoTags = xmlDoc.getElementsByTagName('RunTimeInformation');
  const isActualPlan = runtimeInfoTags.length > 0;

  // Compute exclusive runtime metrics
  computeExclusiveMetrics(root, isActualPlan);

  // Compute totals
  let totalQueryCPUms = 0;
  let totalQueryLogicalReads = 0;
  let totalQueryElapsedms = 0;
  let totalActualRows = 0;

  for (const node of nodesMap.values()) {
    if (node.actualMetrics) {
      totalQueryCPUms += node.actualMetrics.exclusiveCPUms;
      totalQueryLogicalReads += node.actualMetrics.exclusiveLogicalReads;
      totalActualRows += node.actualMetrics.actualRows;
      if (node.actualMetrics.actualElapsedms > totalQueryElapsedms) {
        totalQueryElapsedms = node.actualMetrics.actualElapsedms;
      }
    }
  }

  const totalSubtreeCost = root.estimatedTotalSubtreeCost || 1.0;

  // Calculate True Cost % per node
  for (const node of nodesMap.values()) {
    if (isActualPlan && node.actualMetrics) {
      let cpuFraction = totalQueryCPUms > 0
        ? node.actualMetrics.exclusiveCPUms / totalQueryCPUms
        : 0;
      let readFraction = totalQueryLogicalReads > 0
        ? node.actualMetrics.exclusiveLogicalReads / totalQueryLogicalReads
        : 0;

      let costPct = 0;
      if (totalQueryCPUms > 0 && totalQueryLogicalReads > 0) {
        costPct = (cpuFraction * 0.5 + readFraction * 0.5) * 100;
      } else if (totalQueryCPUms > 0) {
        costPct = cpuFraction * 100;
      } else if (totalQueryLogicalReads > 0) {
        costPct = readFraction * 100;
      } else {
        // Fallback to elapsed time if CPU/reads are zero
        costPct = totalQueryElapsedms > 0
          ? (node.actualMetrics.exclusiveElapsedms / totalQueryElapsedms) * 100
          : 0;
      }
      node.actualMetrics.trueCostPercent = Math.min(100, Math.round(costPct * 10) / 10);
    }

    // Estimated Cost %
    const estOpCost = (node.estimateCPU + node.estimateIO);
    node.actualMetrics = node.actualMetrics || {
      actualRows: 0,
      actualRowsRead: 0,
      actualExecutions: 0,
      actualRebinds: 0,
      actualRewinds: 0,
      actualLogicalReads: 0,
      actualPhysicalReads: 0,
      actualReadAheads: 0,
      actualCPUms: 0,
      actualElapsedms: 0,
      exclusiveCPUms: 0,
      exclusiveElapsedms: 0,
      exclusiveLogicalReads: 0,
      trueCostPercent: 0,
      estimatedCostPercent: 0,
      threads: [],
    };
    node.actualMetrics.estimatedCostPercent = totalSubtreeCost > 0
      ? Math.round((estOpCost / totalSubtreeCost) * 1000) / 10
      : 0;
  }

  // Analyze bottlenecks, rank nodes, and generate recommendations
  const { bottlenecks, summary } = analyzeBottlenecks(root, nodesMap, isActualPlan);

  summary.totalActualRows = totalActualRows;

  return {
    root,
    nodesMap,
    totalQueryCPUms: Math.round(totalQueryCPUms * 10) / 10,
    totalQueryLogicalReads,
    totalQueryElapsedms: Math.round(totalQueryElapsedms * 10) / 10,
    totalSubtreeCost,
    queryText,
    isActualPlan,
    bottlenecks,
    summary,
  };
}
