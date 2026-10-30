import React, { useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { BottleneckScore } from '../types/plan';
import { formatPercent } from '../utils/formatters';

interface BottleneckBarProps {
  bottlenecks: BottleneckScore[];
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
}

export const BottleneckBar: React.FC<BottleneckBarProps> = ({
  bottlenecks,
  selectedNodeId,
  onSelectNode,
}) => {
  const { fitView } = useReactFlow();

  const handleCardClick = (nodeId: string) => {
    onSelectNode(nodeId);
    fitView({
      nodes: [{ id: nodeId }],
      duration: 400,
      maxZoom: 1.25,
      padding: 0.35,
    });
  };

  // Coalesce segments under 2.5% into "Other operators"
  const { visibleSegments, otherCost } = useMemo(() => {
    const visible: BottleneckScore[] = [];
    let remainder = 0;

    for (const b of bottlenecks) {
      if (b.trueCostPercent >= 2.5) {
        visible.push(b);
      } else {
        remainder += b.trueCostPercent;
      }
    }

    const totalAllocated = visible.reduce((acc, b) => acc + b.trueCostPercent, 0) + remainder;
    if (totalAllocated < 100) {
      remainder += 100 - totalAllocated;
    }

    return { visibleSegments: visible, otherCost: Math.max(0, remainder) };
  }, [bottlenecks]);

  const topBottlenecks = bottlenecks.slice(0, 5);
  if (topBottlenecks.length === 0) return null;

  return (
    <div className="bg-[#0b0e15]/95 backdrop-blur-md border-b border-white/[0.08] px-4 py-2.5 z-10 select-none space-y-2.5">
      {/* Query Cost Distribution Flame Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-sans text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-critical-500 animate-pulse" />
            <span className="font-semibold text-white tracking-tight">
              Query cost distribution
            </span>
            <span className="text-slate-500 text-[11px] font-mono hidden sm:inline">
              — Proportional runtime footprint
            </span>
          </div>
          <span className="text-slate-500 text-[11px] font-mono">
            Click segment to inspect operator
          </span>
        </div>

        {/* Multi-segment modern track */}
        <div className="h-3 w-full bg-[#121622] rounded-full overflow-hidden flex border border-white/[0.08] p-0.5 gap-0.5">
          {visibleSegments.map((b) => {
            const widthPct = Math.max(2.5, b.trueCostPercent);
            const isCritical = b.severity === 'CRITICAL';
            const isWarning = b.severity === 'WARNING';
            const isSelected = selectedNodeId === b.nodeId;

            return (
              <button
                type="button"
                key={b.nodeId}
                onClick={() => handleCardClick(b.nodeId)}
                title={`#${b.nodeId} ${b.physicalOp}: ${formatPercent(b.trueCostPercent)}`}
                style={{ width: `${widthPct}%` }}
                className={`h-full rounded-full transition-all duration-200 hover:brightness-125 ${
                  isSelected
                    ? 'ring-2 ring-white z-10'
                    : ''
                } ${
                  isCritical
                    ? 'bg-critical-500'
                    : isWarning
                    ? 'bg-warning-500'
                    : 'bg-brand-500'
                }`}
              />
            );
          })}

          {otherCost > 0.5 && (
            <div
              style={{ width: `${otherCost}%` }}
              title={`Other operators: ${formatPercent(otherCost)}`}
              className="h-full bg-slate-700/50 rounded-full"
            />
          )}
        </div>
      </div>

      {/* Top 5 Bottlenecks Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {topBottlenecks.map((b, index) => {
          const isSelected = selectedNodeId === b.nodeId;
          const isCritical = b.severity === 'CRITICAL';
          const isWarning = b.severity === 'WARNING';

          return (
            <button
              type="button"
              key={b.nodeId}
              onClick={() => handleCardClick(b.nodeId)}
              className={`text-left rounded-xl p-3 transition-all duration-150 border relative group overflow-hidden font-sans ${
                isSelected
                  ? 'bg-[#151a27] border-brand-500 shadow-card-selected'
                  : isCritical
                  ? 'bg-[#180f14] hover:bg-[#20131b] border-critical-500/40 hover:border-critical-500/70 shadow-sm'
                  : isWarning
                  ? 'bg-[#18130a] hover:bg-[#221b0f] border-warning-500/40 hover:border-warning-500/70 shadow-sm'
                  : 'bg-[#10141f] hover:bg-[#151a27] border-white/[0.08] hover:border-white/[0.16]'
              }`}
            >
              {/* Header: Rank + Physical Op + Node ID */}
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold ${
                      isCritical
                        ? 'bg-critical-500 text-white'
                        : isWarning
                        ? 'bg-warning-500 text-black'
                        : 'bg-white/[0.1] text-white'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span className="text-xs font-semibold text-white truncate group-hover:text-white">
                    {b.physicalOp}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  #{b.nodeId}
                </span>
              </div>

              {/* Target / Primary Reason */}
              <div className="text-[11px] font-mono text-slate-300 truncate mb-2">
                {b.targetObject || b.primaryReason}
              </div>

              {/* Metric Row */}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-white/[0.06] font-mono">
                <span
                  className={`text-[10px] truncate max-w-[125px] font-medium ${
                    isCritical
                      ? 'text-critical-500'
                      : isWarning
                      ? 'text-warning-500'
                      : 'text-slate-400'
                  }`}
                >
                  {b.primaryReason}
                </span>

                <span
                  className={`font-bold ${
                    isCritical
                      ? 'text-critical-500'
                      : isWarning
                      ? 'text-warning-500'
                      : 'text-white'
                  }`}
                >
                  {formatPercent(b.trueCostPercent)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
