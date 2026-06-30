function coerceNumber(n) {
  if (n == null) return null;
  if (typeof n === 'number') return Number.isFinite(n) ? n : null;
  if (typeof n === 'object' && n.raw != null) return coerceNumber(n.raw);
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

export function formatPrice(n) {
  n = coerceNumber(n);
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export function formatChange(pct) {
  pct = coerceNumber(pct);
  if (pct == null || Number.isNaN(pct)) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatChangeAmount(n) {
  n = coerceNumber(n);
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export function formatMarketCap(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export function formatVolume(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

export function formatRatio(n, suffix = '') {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n.toFixed(2)}${suffix}`;
}

export function formatPercent(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(2)}%`;
}

export function formatLargeNumber(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  return n.toLocaleString();
}

export function changeClass(pct) {
  if (pct == null || Number.isNaN(pct)) return '';
  if (pct > 0) return 'stocks-change--up';
  if (pct < 0) return 'stocks-change--down';
  return '';
}

export function formatDate(ts) {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
