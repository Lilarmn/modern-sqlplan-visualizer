import React, { useRef, useState, useMemo } from 'react';
import { ViewFilterMode, LayoutDirection, ParsedPlan, PlanNode } from '../types/plan';
import { formatNumber, formatTimeMs } from '../utils/formatters';

interface ToolbarProps {
  plan: ParsedPlan;
  filterMode: ViewFilterMode;
  onFilterModeChange: (mode: ViewFilterMode) => void;
  direction: LayoutDirection;
  onDirectionToggle: () => void;
  autoCollapse: boolean;
  onAutoCollapseToggle: () => void;
  onLoadSample: () => void;
  onOpenPasteModal: () => void;
  onFileUpload: (xmlString: string) => void;
  onSelectNode: (nodeId: string) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  plan,
  filterMode,
  onFilterModeChange,
  direction,
  onDirectionToggle,
  autoCollapse,
  onAutoCollapseToggle,
  onLoadSample,
  onOpenPasteModal,
  onFileUpload,
  onSelectNode,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // Search through all nodes by physicalOp, logicalOp, targetObject, or ID
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matches: PlanNode[] = [];

    plan.nodesMap.forEach((node) => {
      const matchOp = node.physicalOp.toLowerCase().includes(q) || node.logicalOp.toLowerCase().includes(q);
      const matchObj = node.targetObject?.table?.toLowerCase().includes(q) ||
        node.targetObject?.index?.toLowerCase().includes(q) ||
        node.targetObject?.schema?.toLowerCase().includes(q);
      const matchId = String(node.id) === q || `#${node.id}` === q;

      if (matchOp || matchObj || matchId) {
        matches.push(node);
      }
    });

    return matches;
  }, [plan, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    onSelectNode(searchMatches[nextIdx].id);
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIdx);
    onSelectNode(searchMatches[nextIdx].id);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIdx);
    onSelectNode(searchMatches[prevIdx].id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) onFileUpload(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          {
            summary: plan.summary,
            bottlenecks: plan.bottlenecks,
            queryText: plan.queryText,
            totalCPUms: plan.totalQueryCPUms,
            totalLogicalReads: plan.totalQueryLogicalReads,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'sql_execution_plan_analysis.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="bg-[#0c0e14]/90 backdrop-blur-md border-b border-white/[0.08] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none z-20">
      {/* Brand & Load Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 pr-4 border-r border-white/[0.08]">
          <div className="w-7 h-7 rounded-lg bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-500 shadow-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5V19A9 3 0 0 0 21 19V5" />
              <path d="M3 12A9 3 0 0 0 21 12" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-white text-[13px] tracking-tight block">
              SQL Plan Studio
            </span>
            <span className="text-[10px] font-mono text-slate-400 -mt-0.5 block">
              Bottleneck Engine
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 font-sans">
          <button
            type="button"
            onClick={onLoadSample}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-xs text-white border border-white/[0.08] hover:border-white/[0.16] transition-all flex items-center gap-1.5 shadow-sm"
            title="Load demo plan with TempDB spill, skews, and lookups"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            <span>Demo plan</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-xs text-slate-200 border border-white/[0.08] hover:border-white/[0.16] transition-all"
            title="Open .sqlplan or .xml file"
          >
            Open file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sqlplan,.xml"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={onOpenPasteModal}
            className="px-3 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-xs text-slate-200 border border-white/[0.08] hover:border-white/[0.16] transition-all"
            title="Paste raw ShowPlanXML"
          >
            Paste XML
          </button>
        </div>
      </div>

      {/* Modern In-Plan Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 bg-[#121622] px-3 py-1.5 rounded-lg border border-white/[0.08] focus-within:border-brand-500/60 transition-colors shadow-sm font-sans">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentMatchIndex(0);
          }}
          placeholder="Search operator or table..."
          className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-36 sm:w-52 font-sans"
        />
        {searchQuery && (
          <div className="flex items-center gap-1.5 text-[10.5px] text-slate-400 border-l border-white/[0.08] pl-2 font-mono">
            <span>
              {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0/0'}
            </span>
            <button
              type="button"
              onClick={handlePrevMatch}
              className="hover:text-white px-1"
              title="Previous match"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={handleNextMatch}
              className="hover:text-white px-1"
              title="Next match"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="hover:text-white px-1 text-slate-500"
              title="Clear search"
            >
              ✕
            </button>
          </div>
        )}
      </form>

      {/* Mode Controls & Switches */}
      <div className="flex items-center gap-2 font-sans">
        <div className="bg-[#121622] p-1 rounded-lg border border-white/[0.08] flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFilterModeChange('all')}
            className={`px-2.5 py-1 rounded-md text-xs transition-all ${
              filterMode === 'all'
                ? 'bg-brand-500 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Standard
          </button>

          <button
            type="button"
            onClick={() => onFilterModeChange('heatmap')}
            className={`px-2.5 py-1 rounded-md text-xs transition-all ${
              filterMode === 'heatmap'
                ? 'bg-critical-500 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Highlight operators by true exclusive runtime cost"
          >
            Heatmap
          </button>

          <button
            type="button"
            onClick={() => onFilterModeChange('skew')}
            className={`px-2.5 py-1 rounded-md text-xs transition-all ${
              filterMode === 'skew'
                ? 'bg-warning-500 text-black font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Highlight cardinality estimation skews"
          >
            CE Skew
          </button>

          <button
            type="button"
            onClick={() => onFilterModeChange('focus')}
            className={`px-2.5 py-1 rounded-md text-xs transition-all ${
              filterMode === 'focus'
                ? 'bg-purple-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Dim low-cost operators to focus on problem areas"
          >
            Dim low cost
          </button>
        </div>

        {/* Auto-Collapse Toggle */}
        <button
          type="button"
          onClick={onAutoCollapseToggle}
          className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all flex items-center gap-1.5 ${
            autoCollapse
              ? 'bg-healthy-500/15 text-healthy-500 border-healthy-500/40 font-medium'
              : 'bg-[#121622] text-slate-400 border-white/[0.08] hover:text-white'
          }`}
          title="Automatically collapse subtrees with under 2% cumulative cost"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autoCollapse ? 'bg-healthy-500' : 'bg-slate-500'}`} />
          <span>Auto-collapse</span>
        </button>

        {/* Direction Switch */}
        <button
          type="button"
          onClick={onDirectionToggle}
          className="px-2.5 py-1.5 rounded-lg bg-[#121622] hover:bg-[#181e2b] text-xs text-slate-300 border border-white/[0.08] transition-all"
          title={`Graph flow layout (Currently: ${direction === 'LR' ? 'Left to right data flow' : 'Right to left SSMS standard'})`}
        >
          {direction === 'LR' ? 'Left ➔ Right' : 'Right ➔ Left'}
        </button>

        {/* Export JSON */}
        <button
          type="button"
          onClick={handleExportJson}
          className="px-2.5 py-1.5 rounded-lg bg-[#121622] hover:bg-[#181e2b] text-xs text-slate-300 border border-white/[0.08] transition-all"
          title="Export bottleneck report as JSON"
        >
          Export
        </button>
      </div>

      {/* Plan Telemetry Readings */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <div className="px-2.5 py-1 rounded-lg bg-[#121622] border border-white/[0.08] text-slate-200 flex items-center gap-1.5">
          <span className="text-slate-400 font-sans text-[11px]">Duration:</span>
          <span className="font-semibold text-white">{formatTimeMs(plan.totalQueryCPUms)}</span>
        </div>

        <div className="px-2.5 py-1 rounded-lg bg-[#121622] border border-white/[0.08] text-slate-200 flex items-center gap-1.5">
          <span className="text-slate-400 font-sans text-[11px]">Reads:</span>
          <span className="font-semibold text-white">{formatNumber(plan.totalQueryLogicalReads)}</span>
        </div>

        {plan.summary.criticalCount > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-critical-500/15 border border-critical-500/40 text-critical-500 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-critical-500" />
            <span>{plan.summary.criticalCount} Critical</span>
          </div>
        )}

        {plan.summary.warningCount > 0 && (
          <div className="px-2.5 py-1 rounded-lg bg-warning-500/15 border border-warning-500/40 text-warning-500 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
            <span>{plan.summary.warningCount} Warnings</span>
          </div>
        )}
      </div>
    </header>
  );
};
