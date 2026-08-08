/**
 * brawl-api — Official Brawl Stars API proxy (token + IP whitelist stay server-side).
 * Body: { action, playerTag?, clubTag? }
 */
import { jsonResponse, optionsResponse } from '../_shared/cors.ts';
import { HttpError, requireUser } from '../_shared/auth.ts';

const BS_BASE = (Deno.env.get('BRAWL_STARS_API_BASE')?.trim() || 'https://bsproxy.royaleapi.dev/v1').replace(/\/$/, '');
const MAX_BODY_BYTES = 16 * 1024;
const PLAYER_TTL_MS = 120_000;
const CATALOG_TTL_MS = 600_000;

type CacheEntry = { at: number; status: number; body: unknown };
const cache = new Map<string, CacheEntry>();

const ALLOWED = new Set([
  'getPlayer',
  'getBattlelog',
  'getBrawlers',
  'getEvents',
  'getClub',
  'getClubMembers',
]);

function encodeTag(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) throw new HttpError(400, 'playerTag / clubTag is required.');
  const bare = s.replace(/^#/, '').toUpperCase();
  if (!/^[0289PYLQGRJCUV]+$/i.test(bare)) {
    throw new HttpError(400, 'Invalid tag characters.');
  }
  return `%23${bare}`;
}

function getToken(): string {
  const token = Deno.env.get('BRAWL_STARS_API_TOKEN')?.trim();
  if (!token) {
    throw new HttpError(
      503,
      'Brawl Stars API is not configured. Set BRAWL_STARS_API_TOKEN on the server.',
    );
  }
  return token;
}

function readCache(key: string, ttl: number): CacheEntry | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ttl) {
    cache.delete(key);
    return null;
  }
  return hit;
}

async function bsFetch(path: string, ttl: number): Promise<{ status: number; body: unknown }> {
  const cacheKey = path;
  const cached = readCache(cacheKey, ttl);
  if (cached) return { status: cached.status, body: cached.body };

  const token = getToken();
  const res = await fetch(`${BS_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }

  if (res.status === 200) {
    cache.set(cacheKey, { at: Date.now(), status: res.status, body });
  }

  return { status: res.status, body };
}

function mapUpstreamError(status: number, body: unknown): Response {
  const msg =
    (body && typeof body === 'object' && 'message' in body && typeof (body as { message: unknown }).message === 'string'
      ? (body as { message: string }).message
      : null)
    || (status === 403
      ? 'Brawl Stars API forbidden — check token and IP whitelist.'
      : status === 404
      ? 'Not found.'
      : status === 429
      ? 'Brawl Stars API rate limit — try again shortly.'
      : `Brawl Stars API error (${status}).`);
  return jsonResponse({ error: { message: msg, status } }, status >= 400 && status < 600 ? status : 502);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') {
    return jsonResponse({ error: { message: 'Method not allowed.' } }, 405);
  }

  try {
    await requireUser(req);

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return jsonResponse({ error: { message: 'Content-Type must be application/json.' } }, 415);
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: { message: 'Request body too large.' } }, 413);
    }

    let body: Record<string, unknown>;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return jsonResponse({ error: { message: 'Invalid JSON body.' } }, 400);
    }

    const action = String(body.action || '');
    if (!ALLOWED.has(action)) {
      return jsonResponse({ error: { message: `Unknown action: ${action}` } }, 400);
    }

    let path = '';
    let ttl = PLAYER_TTL_MS;
    if (action === 'getPlayer') {
      path = `/players/${encodeTag(body.playerTag)}`;
    } else if (action === 'getBattlelog') {
      path = `/players/${encodeTag(body.playerTag)}/battlelog`;
    } else if (action === 'getClub') {
      path = `/clubs/${encodeTag(body.clubTag)}`;
    } else if (action === 'getClubMembers') {
      path = `/clubs/${encodeTag(body.clubTag)}/members`;
    } else if (action === 'getBrawlers') {
      path = '/brawlers';
      ttl = CATALOG_TTL_MS;
    } else if (action === 'getEvents') {
      path = '/events/rotation';
      ttl = PLAYER_TTL_MS;
    }

    const { status, body: upstream } = await bsFetch(path, ttl);
    if (status !== 200) return mapUpstreamError(status, upstream);
    return jsonResponse({ ok: true, action, data: upstream });
  } catch (err) {
    if (err instanceof HttpError) {
      return jsonResponse({ error: { message: err.message } }, err.status);
    }
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return jsonResponse({ error: { message } }, 500);
  }
});
