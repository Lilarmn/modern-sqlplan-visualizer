import React from 'react';

interface GlyphProps {
  className?: string;
  size?: number;
}

const strokeWidth = 1.6;

export const SeekGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="7" cy="7" r="4.5" />
    <line x1="10.5" y1="10.5" x2="14" y2="14" />
    <line x1="7" y1="4.5" x2="7" y2="9.5" />
    <line x1="4.5" y1="7" x2="9.5" y2="7" />
  </svg>
);

export const ScanGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <line x1="2" y1="6" x2="14" y2="6" />
    <line x1="5.5" y1="6" x2="5.5" y2="13.5" />
    <line x1="8" y1="8.5" x2="12" y2="8.5" />
    <line x1="8" y1="11" x2="12" y2="11" />
  </svg>
);

export const LookupGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="5" cy="8" r="2.5" />
    <path d="M7.5 8H13.5V11" />
    <line x1="11" y1="8" x2="11" y2="10" />
  </svg>
);

export const HashMatchGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M2.5 3.5H6.5L9.5 8L6.5 12.5H2.5" />
    <path d="M9.5 8H13.5" />
    <circle cx="9.5" cy="8" r="1.5" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

export const NestedLoopsGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 11A4.5 4.5 0 1 0 7 3.5L6 5" />
    <polyline points="3.5 4 6 5 7 2.5" />
    <circle cx="8" cy="8" r="1.5" />
  </svg>
);

export const MergeJoinGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="2.5" y1="4.5" x2="6.5" y2="4.5" />
    <line x1="2.5" y1="11.5" x2="6.5" y2="11.5" />
    <path d="M6.5 4.5L10 8L6.5 11.5" />
    <line x1="10" y1="8" x2="13.5" y2="8" />
  </svg>
);

export const SortGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="3" y1="12.5" x2="3" y2="9.5" />
    <line x1="7" y1="12.5" x2="7" y2="6.5" />
    <line x1="11" y1="12.5" x2="11" y2="3.5" />
    <polyline points="10 6 13 3.5 14 7" />
  </svg>
);

export const ExchangeGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="2.5" y1="8" x2="6" y2="8" />
    <path d="M6 8L9.5 4H13.5" />
    <path d="M6 8H13.5" />
    <path d="M6 8L9.5 12H13.5" />
  </svg>
);

export const AggregateGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12.5 3.5H3.5L8 8L3.5 12.5H12.5" />
  </svg>
);

export const FilterGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="2.5,3.5 13.5,3.5 9,8.5 9,13 7,13 7,8.5" />
  </svg>
);

export const ComputeScalarGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 12V7C4 5 5 4 7 4H9" />
    <line x1="3" y1="7" x2="8" y2="7" />
    <line x1="10" y1="10" x2="13" y2="13" />
    <line x1="13" y1="10" x2="10" y2="13" />
  </svg>
);

export const GenericOperatorGlyph: React.FC<GlyphProps> = ({ className = '', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="10" height="10" rx="1.5" />
    <line x1="3" y1="6.5" x2="13" y2="6.5" />
    <line x1="7" y1="9.5" x2="9" y2="9.5" />
  </svg>
);

export const HazardGlyph: React.FC<GlyphProps> = ({ className = '', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 1.5L13 12H1L7 1.5Z" />
    <line x1="7" y1="5.5" x2="7" y2="8" />
    <circle cx="7" cy="10" r="0.6" fill="currentColor" />
  </svg>
);

export function resolveOperatorGlyph(physicalOp: string, logicalOp: string): React.FC<GlyphProps> {
  const p = physicalOp.toLowerCase();
  const l = logicalOp.toLowerCase();

  if (p.includes('index seek') || l.includes('index seek')) return SeekGlyph;
  if (p.includes('index scan') || p.includes('table scan') || p.includes('clustered index scan')) return ScanGlyph;
  if (p.includes('key lookup') || l.includes('key lookup') || p.includes('lookup')) return LookupGlyph;
  if (p.includes('hash match') || l.includes('hash join')) return HashMatchGlyph;
  if (p.includes('nested loops')) return NestedLoopsGlyph;
  if (p.includes('merge join') || p.includes('merge')) return MergeJoinGlyph;
  if (p.includes('sort')) return SortGlyph;
  if (p.includes('parallelism')) return ExchangeGlyph;
  if (p.includes('aggregate')) return AggregateGlyph;
  if (p.includes('filter')) return FilterGlyph;
  if (p.includes('compute scalar')) return ComputeScalarGlyph;
  return GenericOperatorGlyph;
}
