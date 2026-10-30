import React, { useState } from 'react';
import { SAMPLE_SQLPLAN_XML } from '../data/samplePlan';

interface XmlPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (xml: string) => void;
}

export const XmlPasteModal: React.FC<XmlPasteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [xmlInput, setXmlInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!xmlInput.trim()) {
      setError('Please provide valid ShowPlanXML.');
      return;
    }

    try {
      setError(null);
      onSubmit(xmlInput);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to parse ShowPlan XML.');
    }
  };

  const handleLoadSample = () => {
    setXmlInput(SAMPLE_SQLPLAN_XML);
    setError(null);
  };

  const handleClear = () => {
    setXmlInput('');
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none animate-in fade-in duration-150">
      <div className="bg-[#0e121a] border border-white/[0.1] rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-modal">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] bg-[#121622] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Paste execution plan XML
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste the raw .sqlplan XML from SSMS or Extended Events
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 flex flex-col gap-3.5 overflow-hidden">
          {error && (
            <div className="p-3 rounded-xl bg-critical-500/10 border border-critical-500/40 text-rose-300 text-xs flex items-center gap-2 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-critical-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-[280px]">
            <div className="flex justify-between items-center mb-1.5 text-xs font-sans">
              <label className="text-slate-300 font-medium">
                XML content
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
                <span className="text-white/[0.1]">|</span>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
                >
                  Fill with demo plan
                </button>
              </div>
            </div>
            <textarea
              value={xmlInput}
              onChange={(e) => {
                setXmlInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder='<ShowPlanXML xmlns="http://schemas.microsoft.com/sqlserver/2004/07/showplan" ...> ... </ShowPlanXML>'
              className="flex-1 w-full bg-[#080a0f] border border-white/[0.08] rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/60 focus:ring-1 focus:ring-brand-500/40 resize-none select-text"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.08] font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs text-slate-300 hover:text-white transition-colors border border-white/[0.08]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-xs text-white font-medium transition-colors shadow-sm"
            >
              Show execution plan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
