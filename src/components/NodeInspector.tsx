import React, { useState } from 'react';
import { PlanNode, BottleneckScore } from '../types/plan';
import {
  formatNumber,
  formatPercent,
} from '../utils/formatters';
import { resolveOperatorGlyph, HazardGlyph } from './OperatorGlyphs';

interface NodeInspectorProps {
  node: PlanNode | null;
  bottleneck?: BottleneckScore;
  onClose: () => void;
  onNavigateToNode: (nodeId: string) => void;
}

type TabType = 'tuning' | 'metrics' | 'threads' | 'predicates';

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  node,
  bottleneck,
  onClose,
  onNavigateToNode,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('tuning');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!node) return null;

  const metrics = node.actualMetrics;
  const severity = bottleneck?.severity || 'HEALTHY';
  const recommendations = bottleneck?.recommendations || [];
  const OperatorGlyph = resolveOperatorGlyph(node.physicalOp, node.logicalOp);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const actualRows = metrics?.actualRows ?? 0;
  const estimateRows = Math.max(1, node.estimateRows);

  return (
    <aside className="fixed top-0 right-0 h-full w-[490px] max-w-full bg-[#0d1017]/95 backdrop-blur-xl border-l border-white/[0.08] shadow-2xl z-50 flex flex-col text-slate-100 select-none font-sans">
      {/* Inspector Header */}
      <div className="p-4 border-b border-white/[0.08] bg-[#10141f]/80 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${
              severity === 'CRITICAL'
                ? 'bg-critical-500/15 border-critical-500/40 text-critical-500'
                : severity === 'WARNING'
                ? 'bg-warning-500/15 border-warning-500/40 text-warning-500'
                : 'bg-white/[0.05] border-white/[0.08] text-slate-200'
            }`}
          >
            <OperatorGlyph size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-tight truncate">
                {node.physicalOp}
              </h3>
              <span className="font-mono text-xs text-slate-400 px-1.5 py-0.2 rounded bg-white/[0.05] border border-white/[0.08]">
                #{node.id}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono truncate">
              Logical op: {node.logicalOp}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
          title="Close inspector"
        >
          Close
        </button>
      </div>

      {/* Target Object / Table Banner */}
      {node.targetObject && (
        <div className="px-4 py-2.5 border-b border-white/[0.06] bg-[#0a0d14] flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400 truncate">
            {node.targetObject.database ? `${node.targetObject.database}.` : ''}
            {node.targetObject.schema ? `${node.targetObject.schema}.` : ''}
            <span className="text-white font-semibold">[{node.targetObject.table || 'Table'}]</span>
            {node.targetObject.index && (
              <span className="text-sky-400">.[{node.targetObject.index}]</span>
            )}
          </span>
          {node.targetObject.storage && (
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-slate-400">
              {node.targetObject.storage}
            </span>
          )}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-white/[0.08] bg-[#0f131d] text-xs font-sans px-3">
        <button
          type="button"
          onClick={() => setActiveTab('tuning')}
          className={`px-3 py-2.5 border-b-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'tuning'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Tuning advice</span>
          {recommendations.length > 0 && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-brand-500/20 text-brand-500 font-bold">
              {recommendations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={`px-3 py-2.5 border-b-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'metrics'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Metrics matrix</span>
        </button>

        {metrics && metrics.threads.length > 1 && (
          <button
            type="button"
            onClick={() => setActiveTab('threads')}
            className={`px-3 py-2.5 border-b-2 font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'threads'
                ? 'border-brand-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Threads ({metrics.threads.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('predicates')}
          className={`px-3 py-2.5 border-b-2 font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'predicates'
              ? 'border-brand-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Predicates</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: TUNING ADVICE */}
        {activeTab === 'tuning' && (
          <div className="space-y-3.5">
            {/* Warnings Alert Box */}
            {node.warnings.length > 0 && (
              <div className="bg-[#1f0d14] rounded-xl border border-critical-500/40 p-3.5 space-y-2.5">
                <span className="text-xs font-semibold text-critical-500 flex items-center gap-2">
                  <HazardGlyph size={14} className="text-critical-500 flex-shrink-0" />
                  Warnings detected ({node.warnings.length})
                </span>
                {node.warnings.map((w, idx) => (
                  <div key={idx} className="bg-[#12070c] p-3 rounded-lg border border-critical-500/20 text-xs">
                    <span className="text-white font-medium block">{w.title}</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">
                      {w.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Suggested T-SQL Fixes */}
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-white block">
                Actionable DBA / T-SQL fixes
              </span>
              {recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="bg-[#10141f] rounded-xl border border-white/[0.08] p-3.5 text-xs text-slate-200 relative group leading-relaxed font-sans shadow-sm"
                  >
                    <p className="pr-14 text-slate-200">{rec}</p>
                    <button
                      type="button"
                      onClick={() => handleCopy(rec, idx)}
                      className="absolute top-2.5 right-2.5 text-xs text-slate-400 hover:text-white px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] font-mono transition-colors"
                      title="Copy recommendation"
                    >
                      {copiedIndex === idx ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="bg-[#10141f] rounded-xl border border-white/[0.08] p-4 text-xs text-slate-400 text-center">
                  No performance warnings or tuning suggestions for this operator.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: METRICS MATRIX */}
        {activeTab === 'metrics' && (
          <div className="space-y-3.5">
            {/* Cost Summary Box */}
            <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
              <div className="bg-[#10141f] p-3 rounded-xl border border-white/[0.08]">
                <span className="text-[10px] text-slate-400 font-sans block">
                  True runtime cost
                </span>
                <span className="text-lg font-bold text-brand-500 mt-0.5 block">
                  {formatPercent(metrics?.trueCostPercent)}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">Exclusive CPU & IO</span>
              </div>
              <div className="bg-[#10141f] p-3 rounded-xl border border-white/[0.08]">
                <span className="text-[10px] text-slate-400 font-sans block">
                  Estimated subtree cost
                </span>
                <span className="text-lg font-bold text-slate-300 mt-0.5 block">
                  {formatPercent(metrics?.estimatedCostPercent)}
                </span>
                <span className="text-[10px] text-slate-400 block font-sans">Optimizer prediction</span>
              </div>
            </div>

            {/* Precision Table */}
            <div className="bg-[#10141f] rounded-xl border border-white/[0.08] overflow-hidden">
              <table className="w-full text-xs text-left font-mono">
                <thead className="text-[10px] text-slate-400 bg-[#0c0e15] border-b border-white/[0.08]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-medium font-sans">Metric</th>
                    <th className="py-2.5 px-3.5 font-medium text-right font-sans">Actual</th>
                    <th className="py-2.5 px-3.5 font-medium text-right font-sans">Estimated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-slate-200">
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-400 font-sans">Rows returned</td>
                    <td className="py-2.5 px-3.5 text-right font-bold text-white">
                      {formatNumber(actualRows)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-400">
                      {formatNumber(estimateRows)}
                    </td>
                  </tr>
                  {metrics && metrics.actualRowsRead !== actualRows && (
                    <tr>
                      <td className="py-2.5 px-3.5 text-slate-400 font-sans">Rows read (storage)</td>
                      <td className="py-2.5 px-3.5 text-right font-bold text-warning-500">
                        {formatNumber(metrics.actualRowsRead)}
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-slate-500">-</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-400 font-sans">Executions</td>
                    <td className="py-2.5 px-3.5 text-right">
                      {formatNumber(metrics?.actualExecutions || 1)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-400">
                      {formatNumber(node.estimateRebinds + node.estimateRewinds + 1)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-400 font-sans">Exclusive CPU</td>
                    <td className="py-2.5 px-3.5 text-right text-white font-semibold">
                      {metrics ? `${Math.round(metrics.exclusiveCPUms)} ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-400">
                      {node.estimateCPU.toFixed(4)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-400 font-sans">Logical reads</td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-sky-400">
                      {metrics ? formatNumber(metrics.actualLogicalReads) : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-400">
                      {node.estimateIO.toFixed(4)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-400 font-sans">Physical reads</td>
                    <td className="py-2.5 px-3.5 text-right text-slate-300">
                      {metrics ? formatNumber(metrics.actualPhysicalReads) : '-'}
                    </td>
                    <td className="py-2.5 px-3.5 text-right text-slate-500">-</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-400 font-sans">Subtree total cost</td>
                    <td className="py-2.5 px-3.5 text-right text-slate-500">-</td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-white">
                      {node.estimatedTotalSubtreeCost.toFixed(4)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: THREAD BREAKDOWN (PARALLELISM) */}
        {activeTab === 'threads' && metrics && metrics.threads.length > 1 && (
          <div className="space-y-3.5">
            <div className="bg-[#10141f] p-3.5 rounded-xl border border-white/[0.08]">
              <span className="text-xs font-semibold text-white block mb-2.5 font-sans">
                Parallel thread distribution ({metrics.threads.length} threads)
              </span>
              <div className="space-y-2.5">
                {metrics.threads.map((t) => {
                  const maxRows = Math.max(...metrics.threads.map((x) => x.actualRows));
                  const pct = maxRows > 0 ? (t.actualRows / maxRows) * 100 : 0;

                  return (
                    <div key={t.threadId} className="space-y-1 font-mono text-xs">
                      <div className="flex justify-between text-xs">
                        <span className="text-white font-medium">Thread {t.threadId}</span>
                        <span className="text-slate-400">
                          {formatNumber(t.actualRows)} rows ({Math.round(t.actualCPUms)}ms CPU)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-500 to-purple-500 rounded-full transition-all"
                          style={{ width: `${Math.max(2, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PREDICATES & SQL */}
        {activeTab === 'predicates' && (
          <div className="space-y-3.5">
            {node.seekPredicates && node.seekPredicates.length > 0 && (
              <div className="bg-[#10141f] rounded-xl border border-white/[0.08] p-3.5 space-y-2">
                <span className="text-xs font-semibold text-emerald-400 block font-sans">
                  Seek predicates
                </span>
                {node.seekPredicates.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0a0d14] border border-white/[0.06] font-mono text-xs text-emerald-300 break-all select-text"
                  >
                    {p}
                  </div>
                ))}
              </div>
            )}

            {node.predicates && node.predicates.length > 0 && (
              <div className="bg-[#10141f] rounded-xl border border-white/[0.08] p-3.5 space-y-2">
                <span className="text-xs font-semibold text-amber-400 block font-sans">
                  Filter / residual predicates
                </span>
                {node.predicates.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#0a0d14] border border-white/[0.06] font-mono text-xs text-amber-300 break-all select-text"
                  >
                    {p}
                  </div>
                ))}
              </div>
            )}

            {node.outputColumns && node.outputColumns.length > 0 && (
              <div className="bg-[#10141f] rounded-xl border border-white/[0.08] p-3.5 space-y-2">
                <span className="text-xs font-semibold text-slate-300 block font-sans">
                  Output column list ({node.outputColumns.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {node.outputColumns.map((col, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[#0a0d14] border border-white/[0.06] text-slate-300 select-text"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(!node.seekPredicates || node.seekPredicates.length === 0) &&
              (!node.predicates || node.predicates.length === 0) && (
                <div className="bg-[#10141f] rounded-xl border border-white/[0.08] p-4 text-xs text-slate-400 text-center font-sans">
                  No explicit predicates registered on this operator.
                </div>
              )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#10141f] flex items-center justify-between text-xs font-mono">
        {node.parentId ? (
          <button
            type="button"
            onClick={() => onNavigateToNode(node.parentId!)}
            className="text-slate-300 hover:text-white transition-colors font-sans flex items-center gap-1"
          >
            <span>Parent #{node.parentId}</span>
          </button>
        ) : (
          <span className="text-slate-500 font-sans">Root operator</span>
        )}

        <div className="flex items-center gap-1.5">
          {node.children.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => onNavigateToNode(c.id)}
              className="px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/[0.08] text-[11px] transition-colors"
            >
              Child #{c.id}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
