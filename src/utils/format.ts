export function formatDollar(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '$0.00';
  const sign = value >= 0 ? '' : '-';
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

export function formatPct(value: number | undefined | null, decimals = 1): string {
  if (value == null || isNaN(value)) return '0.0%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatVolume(v: number | undefined | null): string {
  if (v == null || isNaN(v)) return 'N/A';
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v.toString();
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateFull(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function daysUntil(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Safe toFixed — never crashes on undefined/null/NaN
 */
export function safeFixed(value: number | undefined | null, decimals = 1): string {
  if (value == null || isNaN(value)) return '0';
  return value.toFixed(decimals);
}

/**
 * Format a snake_case strategy name into a pretty title.
 * e.g. "sell_put" -> "Sell Put", "iron_condor" -> "Iron Condor"
 */
export function formatStrategy(strategy: string | undefined | null): string {
  if (!strategy) return '';
  return strategy
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function starRating(score: number | undefined | null, max = 5): string {
  if (score == null || isNaN(score)) return '☆'.repeat(max);
  const filled = Math.min(Math.max(Math.round(score), 0), max);
  return '★'.repeat(filled) + '☆'.repeat(max - filled);
}
