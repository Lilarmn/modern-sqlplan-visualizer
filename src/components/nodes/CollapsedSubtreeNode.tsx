import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { LayoutDirection } from '../../types/plan';
import { formatPercent } from '../../utils/formatters';

export interface CollapsedSubtreeNodeData {
  id: string;
  nodeCount: number;
  cumulativeCost: number;
  direction: LayoutDirection;
  onExpand: (id: string) => void;
}

export const CollapsedSubtreeNode = memo(({ data }: { data: CollapsedSubtreeNodeData }) => {
  const { id, nodeCount, cumulativeCost, direction, onExpand } = data;

  let sourcePosition = Position.Right;
  let targetPosition = Position.Left;

  if (direction === 'RL') {
    sourcePosition = Position.Left;
    targetPosition = Position.Right;
  } else if (direction === 'TB') {
    sourcePosition = Position.Bottom;
    targetPosition = Position.Top;
  }

  return (
    <div
      onClick={() => onExpand(id)}
      className="modern-operator-card relative w-[250px] rounded-xl border border-white/[0.08] hover:border-healthy-500/50 bg-[#10141f]/95 backdrop-blur-md p-3 shadow-card transition-all cursor-pointer group select-none"
    >
      <Handle
        type="target"
        position={targetPosition}
        className="!w-2.5 !h-2.5 !bg-healthy-500 !border-2 !border-[#090b10] !rounded-full"
      />
      <Handle
        type="source"
        position={sourcePosition}
        className="!w-2.5 !h-2.5 !bg-healthy-500 !border-2 !border-[#090b10] !rounded-full"
      />

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
            <span>Healthy subtree</span>
            <span className="text-[10px] font-mono text-slate-400">({nodeCount} ops)</span>
          </div>
          <span className="text-[11px] font-mono text-healthy-500 block mt-0.5">
            Cumulative cost: {formatPercent(cumulativeCost)}
          </span>
        </div>

        <button
          type="button"
          className="px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-xs font-sans text-slate-300 group-hover:text-white transition-colors border border-white/[0.06]"
          title="Click to expand subtree"
        >
          Expand
        </button>
      </div>
    </div>
  );
});

CollapsedSubtreeNode.displayName = 'CollapsedSubtreeNode';
