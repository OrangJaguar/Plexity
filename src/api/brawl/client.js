/**
 * Client for official Brawl Stars data via server proxy (Edge Function or local proxy).
 */
import { invokeBackendFunction } from '@/api/functions/invoke';
import { formatBrawlTagDisplay, normalizeBrawlTag } from '@/api/brawl/tags';

/**
 * When set to a local proxy base (e.g. http://127.0.0.1:8788), use it instead of Edge.
 * Do NOT set this to bsproxy.royaleapi.dev — that is BRAWL_STARS_API_BASE on the server.
 */
function localProxyBase() {
  const raw = import.meta.env.VITE_BRAWL_PROXY_URL;
  if (raw == null || String(raw).trim() === '') return '';
  const base = String(raw).trim().replace(/\/$/, '');
  const lower = base.toLowerCase();
  if (
    lower.includes('royaleapi.dev')
    || lower.includes('brawlstars.com')
    || lower.includes('api.brawlstars')
  ) {
    return '';
  }
  return base;
}

/**
 * @param {string} action
 * @param {Record<string, unknown>} [payload]
 */
async function callBrawlApi(action, payload = {}) {
  const body = { action, ...payload };
  const proxy = localProxyBase();

  if (proxy) {
    const res = await fetch(`${proxy}/brawl-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.error) {
      const msg = json?.error?.message || json?.error || `Brawl proxy failed (${res.status})`;
      throw new Error(typeof msg === 'string' ? msg : 'Brawl proxy failed');
    }
    return json.data;
  }

  const result = await invokeBackendFunction('brawlApi', body);
  return result?.data;
}

/** @param {string} playerTag */
export async function fetchBrawlPlayer(playerTag) {
  const tag = normalizeBrawlTag(playerTag);
  return callBrawlApi('getPlayer', { playerTag: tag });
}

/** @param {string} playerTag */
export async function fetchBrawlBattlelog(playerTag) {
  const tag = normalizeBrawlTag(playerTag);
  return callBrawlApi('getBattlelog', { playerTag: tag });
}

/** Official catalog (via proxy) — prefer BrawlAPI CDN for UI art when possible. */
export async function fetchOfficialBrawlers() {
  return callBrawlApi('getBrawlers');
}

export async function fetchBrawlEventsRotation() {
  return callBrawlApi('getEvents');
}

/** @param {string} clubTag */
export async function fetchBrawlClub(clubTag) {
  const tag = normalizeBrawlTag(clubTag);
  return callBrawlApi('getClub', { clubTag: tag });
}

export { formatBrawlTagDisplay, normalizeBrawlTag };
