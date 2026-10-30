import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { formatNumber } from '../../utils/formatters';

export interface DataFlowEdgeData {
  actualRows: number;
  estimateRows: number;
  executions: number;
  isSkewed: boolean;
  isCriticalSkew: boolean;
}

export const DataFlowEdge = memo((props: EdgeProps) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  } = props;

  const edgeData = (data as unknown as DataFlowEdgeData) || {
    actualRows: 0,
    estimateRows: 1,
    executions: 1,
    isSkewed: false,
    isCriticalSkew: false,
  };

  const { actualRows, executions, isSkewed, isCriticalSkew } = edgeData;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Logarithmic stroke width: 1.5px up to 5px
  const strokeWidth = Math.min(
    5,
    Math.max(1.5, Math.round(Math.log10(Math.max(10, actualRows)) * 1.05 * 10) / 10)
  );

  let strokeColor = '#3b4861'; // Modern steel

  if (isCriticalSkew) {
    strokeColor = '#f43f5e'; // Rose
  } else if (isSkewed) {
    strokeColor = '#f59e0b'; // Amber
  } else if (actualRows > 100_000) {
    strokeColor = '#3b82f6'; // Brand Blue
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: actualRows > 0 ? '5 4' : 'none',
        }}
        className={actualRows > 50_000 ? 'pipeline-stream-fast' : actualRows > 0 ? 'pipeline-stream' : ''}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono shadow-sm flex items-center gap-1 border backdrop-blur-md transition-transform hover:scale-110 ${
              isCriticalSkew
                ? 'bg-critical-950/90 text-rose-300 border-critical-500/50'
                : isSkewed
                ? 'bg-warning-950/90 text-amber-300 border-warning-500/50'
                : 'bg-[#10141f]/90 text-slate-200 border-white/[0.08]'
            }`}
            title={`Actual rows: ${actualRows.toLocaleString()} | Executions: ${executions.toLocaleString()}`}
          >
            <span className="font-semibold text-white">{formatNumber(actualRows)}</span>
            <span className="text-slate-400">rows</span>
            {executions > 1 && (
              <span className="text-slate-400 border-l border-white/[0.1] pl-1 ml-0.5">
                x{formatNumber(executions)}
              </span>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

DataFlowEdge.displayName = 'DataFlowEdge';
