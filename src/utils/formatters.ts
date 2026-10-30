/**
 * Utility functions for formatting numbers, sizes, and times in the execution plan
 */

export function formatNumber(num: number | undefined): string {
  if (num === undefined || isNaN(num)) return '0';
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 10_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }
  return num.toLocaleString();
}

export function formatTimeMs(ms: number | undefined): string {
  if (ms === undefined || isNaN(ms)) return '0 ms';
  if (ms >= 60_000) {
    const mins = Math.floor(ms / 60_000);
    const secs = ((ms % 60_000) / 1000).toFixed(1);
    return `${mins}m ${secs}s`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)} s`;
  }
  return `${ms.toFixed(1)} ms`;
}

export function formatPercent(pct: number | undefined): string {
  if (pct === undefined || isNaN(pct)) return '0%';
  return `${pct.toFixed(1)}%`;
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || isNaN(bytes)) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function cleanObjectName(name: string | undefined): string {
  if (!name) return '';
  return name.replace(/[[\]]/g, '');
}
