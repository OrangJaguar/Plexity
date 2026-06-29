/** US market session helpers (Eastern Time). */

export function getUsMarketSession(now = new Date()) {
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const minutes = et.getHours() * 60 + et.getMinutes();

  if (day === 0 || day === 6) return 'closed';

  if (minutes >= 9 * 60 + 30 && minutes < 16 * 60) return 'regular';
  if (minutes >= 4 * 60 && minutes < 9 * 60 + 30) return 'pre';
  if (minutes >= 16 * 60 && minutes < 20 * 60) return 'after';
  return 'closed';
}

/** Refresh interval in ms: ~2 min during tradable hours, ~15 min when closed. */
export function getStocksRefreshIntervalMs(now = new Date()) {
  const session = getUsMarketSession(now);
  return session === 'closed' ? 15 * 60 * 1000 : 2 * 60 * 1000;
}

export function formatUpdatedAgo(ms) {
  if (ms == null || ms < 0) return 'Updated just now';
  const sec = Math.floor(ms / 1000);
  if (sec < 5) return 'Updated just now';
  if (sec < 60) return `Updated ${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `Updated ${min}m ago`;
  const hr = Math.floor(min / 60);
  return `Updated ${hr}h ago`;
}
