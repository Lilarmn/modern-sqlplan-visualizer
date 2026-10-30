import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { PlanNode, BottleneckScore, ViewFilterMode, LayoutDirection } from '../../types/plan';
import { formatNumber, formatPercent } from '../../utils/formatters';
import { resolveOperatorGlyph, HazardGlyph } from '../OperatorGlyphs';

export interface OperatorNodeData {
  node: PlanNode;
  bottleneck?: BottleneckScore;
  filterMode: ViewFilterMode;
  direction: LayoutDirection;
  isSelected?: boolean;
}

export const OperatorNode = memo(({ data }: { data: OperatorNodeData }) => {
  const { node, bottleneck, filterMode, direction, isSelected } = data;
  const metrics = node.actualMetrics;
  const severity = bottleneck?.severity || 'HEALTHY';
  const trueCost = metrics?.trueCostPercent ?? metrics?.estimatedCostPercent ?? 0;
  const OperatorGlyph = resolveOperatorGlyph(node.physicalOp, node.logicalOp);

  // Flow handle positioning
  let sourcePosition = Position.Right;
  let targetPosition = Position.Left;

  if (direction === 'RL') {
    sourcePosition = Position.Left;
    targetPosition = Position.Right;
  } else if (direction === 'TB') {
    sourcePosition = Position.Bottom;
    targetPosition = Position.Top;
  }

  // Row and Skew calculations
  const actualRows = metrics?.actualRows ?? 0;
  const estimateRows = Math.max(1, node.estimateRows);
  const skewRatio = actualRows / estimateRows;
  const normSkew = skewRatio >= 1 ? skewRatio : 1 / Math.max(0.0001, skewRatio);
  const isSkewed = normSkew >= 5 && Math.abs(actualRows - estimateRows) > 500;
  const isCriticalSkew = normSkew >= 20 && Math.abs(actualRows - estimateRows) > 1000;

  // Logarithmic row ratio
  const maxRowLog = Math.log10(Math.max(10, Math.max(actualRows, estimateRows)));
  const actPct = Math.min(100, Math.max(3, (Math.log10(Math.max(1, actualRows)) / maxRowLog) * 100));
  const estPct = Math.min(100, Math.max(3, (Math.log10(Math.max(1, estimateRows)) / maxRowLog) * 100));

  // Anti-patterns check
  const hasSpill = node.warnings.some((w) => w.type === 'TEMPDB_SPILL');
  const hasConvert = node.warnings.some((w) => w.type === 'IMPLICIT_CONVERT');
  const isLookup = node.logicalOp === 'Key Lookup' || node.physicalOp.includes('Key Lookup');

  // Dynamic modern styling
  let borderClasses = 'border-white/[0.08] hover:border-white/[0.2]';
  let glowClasses = 'shadow-card';

  if (isSelected) {
    borderClasses = 'border-brand-500 ring-2 ring-brand-500/40';
    glowClasses = 'shadow-card-selected';
  } else if (severity === 'CRITICAL') {
    borderClasses = 'border-critical-500/70 hover:border-critical-500';
    glowClasses = 'shadow-card-critical';
  } else if (severity === 'WARNING') {
    borderClasses = 'border-warning-500/70 hover:border-warning-500';
    glowClasses = 'shadow-card-warning';
  }

  let cardBg = 'bg-[#10141f]/95 backdrop-blur-md';

  if (filterMode === 'heatmap') {
    if (trueCost >= 25) {
      cardBg = 'bg-[#220d15]/95';
    } else if (trueCost >= 10) {
      cardBg = 'bg-[#21150a]/95';
    } else if (trueCost >= 3) {
      cardBg = 'bg-[#0f1828]/95';
    }
  } else if (filterMode === 'skew') {
    if (isCriticalSkew) {
      cardBg = 'bg-[#240b17]/95';
    } else if (isSkewed) {
      cardBg = 'bg-[#211308]/95';
    }
  }

  const isDimmed = filterMode === 'focus' && severity === 'HEALTHY';

  return (
    <div
      className={`modern-operator-card relative w-[305px] rounded-xl border text-slate-100 select-none overflow-hidden transition-all duration-200 ${cardBg} ${borderClasses} ${glowClasses} ${
        isDimmed ? 'opacity-25 hover:opacity-90' : 'opacity-100'
      }`}
    >
      {/* Top Cost Indicator Meter */}
      <div className="w-full h-1 bg-white/[0.04] relative">
        <div
          className={`h-full transition-all duration-300 ${
            trueCost >= 25
              ? 'bg-gradient-to-r from-critical-500 to-rose-400'
              : trueCost >= 10
              ? 'bg-gradient-to-r from-warning-500 to-amber-400'
              : trueCost > 0
              ? 'bg-gradient-to-r from-brand-500 to-sky-400'
              : 'bg-slate-700'
          }`}
          style={{ width: `${Math.min(100, Math.max(trueCost > 0 ? 3 : 0, trueCost))}%` }}
        />
      </div>

      {/* Target & Source Flow Handles */}
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2.5 !h-2.5 !bg-brand-500 !border-2 !border-[#090b10] !rounded-full transition-transform hover:scale-125"
      />
      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2.5 !h-2.5 !bg-healthy-500 !border-2 !border-[#090b10] !rounded-full transition-transform hover:scale-125"
      />

      <div className="p-3.5 space-y-2.5">
        {/* Operator Identity Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${
                severity === 'CRITICAL'
                  ? 'bg-critical-500/10 border-critical-500/30 text-critical-500'
                  : severity === 'WARNING'
                  ? 'bg-warning-500/10 border-warning-500/30 text-warning-500'
                  : 'bg-white/[0.05] border-white/[0.08] text-slate-300'
              }`}
            >
              <OperatorGlyph size={15} />
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-semibold text-white tracking-tight truncate block">
                {node.physicalOp}
              </span>
              {node.logicalOp !== node.physicalOp ? (
                <span className="text-[10px] text-slate-400 font-mono block truncate -mt-0.5">
                  {node.logicalOp}
                </span>
              ) : (
                <span className="text-[9.5px] font-mono text-slate-500 uppercase tracking-wider block -mt-0.5">
                  operator
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 font-mono">
            {node.parallel && (
              <span className="px-1.5 py-0.5 rounded text-[9.5px] bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium" title="Parallel Execution">
                PAR
              </span>
            )}
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] text-slate-400 border border-white/[0.08]">
              #{node.id}
            </span>
          </div>
        </div>

        {/* Database Object Target Badge */}
        {node.targetObject ? (
          <div className="px-2.5 py-1 rounded-md bg-[#0a0d14] border border-white/[0.06] text-[11px] font-mono flex items-center gap-1.5 text-slate-300 truncate">
            <span className="text-white font-medium truncate">
              {node.targetObject.table || 'Object'}
            </span>
            {node.targetObject.index && (
              <span className="text-sky-400 truncate">
                .{node.targetObject.index}
              </span>
            )}
          </div>
        ) : (
          <div className="px-2.5 py-0.5 rounded-md bg-[#0a0d14]/60 border border-white/[0.04] text-[10px] font-mono text-slate-500 truncate">
            In-memory pipeline
          </div>
        )}

        {/* Technical Metric Triad */}
        <div className="grid grid-cols-3 gap-1.5 text-xs font-mono bg-[#0a0d14] rounded-lg p-2 border border-white/[0.06]">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">
              True cost
            </span>
            <span
              className={`text-xs font-bold mt-0.5 block ${
                trueCost >= 25
                  ? 'text-critical-500'
                  : trueCost >= 10
                  ? 'text-warning-500'
                  : 'text-slate-200'
              }`}
            >
              {formatPercent(trueCost)}
            </span>
          </div>

          <div className="border-l border-white/[0.06] pl-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">
              Log. reads
            </span>
            <span className="text-xs font-bold text-slate-200 mt-0.5 block truncate">
              {formatNumber(metrics?.actualLogicalReads)}
            </span>
          </div>

          <div className="border-l border-white/[0.06] pl-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans block">
              CPU (excl)
            </span>
            <span className="text-xs font-bold text-slate-200 mt-0.5 block truncate">
              {metrics ? `${Math.round(metrics.exclusiveCPUms)}ms` : '0ms'}
            </span>
          </div>
        </div>

        {/* Cardinality Health Gauge */}
        <div className="bg-[#0a0d14] rounded-lg p-2 border border-white/[0.06] text-xs space-y-1.5">
          <div className="flex items-center justify-between font-mono">
            <span className="text-[9.5px] text-slate-400 font-sans">Rows (act / est)</span>
            <div className="flex items-center gap-1.5">
              {isSkewed && (
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${
                    isCriticalSkew
                      ? 'bg-critical-500/15 border-critical-500/40 text-critical-500'
                      : 'bg-warning-500/15 border-warning-500/40 text-warning-500'
                  }`}
                >
                  {normSkew >= 1000
                    ? `${formatNumber(normSkew)}x`
                    : `${normSkew.toFixed(normSkew > 10 ? 0 : 1)}x`}{' '}
                  skew
                </span>
              )}
              <span className="text-white font-bold">
                {formatNumber(actualRows)}
              </span>
            </div>
          </div>

          {/* Micro Dual Meter */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden flex">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isCriticalSkew
                    ? 'bg-critical-500'
                    : isSkewed
                    ? 'bg-warning-500'
                    : 'bg-healthy-500'
                }`}
                style={{ width: `${actPct}%` }}
                title={`Actual rows: ${actualRows.toLocaleString()}`}
              />
            </div>
            <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden flex">
              <div
                className="h-full bg-slate-500 rounded-full"
                style={{ width: `${estPct}%` }}
                title={`Estimated rows: ${estimateRows.toLocaleString()}`}
              />
            </div>
          </div>

          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Est: {formatNumber(estimateRows)}</span>
            <span>Act: {formatNumber(actualRows)}</span>
          </div>
        </div>

        {/* Modern Anti-Pattern Chips */}
        {(hasSpill || hasConvert || isLookup || node.warnings.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-0.5 font-mono text-[10px]">
            {hasSpill && (
              <span className="px-2 py-0.5 rounded-md bg-critical-500/15 text-rose-300 border border-critical-500/30 flex items-center gap-1 font-semibold">
                <HazardGlyph size={11} className="text-critical-500" />
                TempDB spill
              </span>
            )}
            {hasConvert && (
              <span className="px-2 py-0.5 rounded-md bg-warning-500/15 text-amber-300 border border-warning-500/30 flex items-center gap-1 font-semibold">
                <HazardGlyph size={11} className="text-warning-500" />
                Implicit convert
              </span>
            )}
            {isLookup && (metrics?.actualExecutions || 0) > 100 && (
              <span className="px-2 py-0.5 rounded-md bg-warning-500/15 text-amber-300 border border-warning-500/30 flex items-center gap-1 font-semibold">
                High lookups ({formatNumber(metrics?.actualExecutions)})
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

OperatorNode.displayName = 'OperatorNode';
