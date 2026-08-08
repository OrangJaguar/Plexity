/**
 * Local Brawl Stars API proxy for development.
 * Bind 127.0.0.1 only. Whitelist your public IP on developer.brawlstars.com.
 *
 *   BRAWL_STARS_API_TOKEN=... npm run brawl:proxy
 *   # optional in .env for the Vite app:
 *   VITE_BRAWL_PROXY_URL=http://127.0.0.1:8788
 */
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = Number(process.env.BRAWL_PROXY_PORT || 8788);
const BS_BASE = (process.env.BRAWL_STARS_API_BASE || 'https://bsproxy.royaleapi.dev/v1').replace(/\/$/, '');
const ALLOWED = new Set([
  'getPlayer',
  'getBattlelog',
  'getBrawlers',
  'getEvents',
  'getClub',
  'getClubMembers',
]);

function loadDotEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"'))
      || (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = val;
  }
}

loadDotEnv();

function encodeTag(raw) {
  const bare = String(raw ?? '').trim().replace(/^#/, '').toUpperCase();
  if (!bare) throw Object.assign(new Error('Tag required'), { status: 400 });
  if (!/^[0289PYLQGRJCUV]+$/i.test(bare)) {
    throw Object.assign(new Error('Invalid tag characters'), { status: 400 });
  }
  return `%23${bare}`;
}

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(payload);
}

async function bsFetch(path) {
  const token = process.env.BRAWL_STARS_API_TOKEN?.trim();
  if (!token) {
    const err = new Error('Set BRAWL_STARS_API_TOKEN in .env or the environment.');
    err.status = 503;
    throw err;
  }
  const res = await fetch(`${BS_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  const text = await res.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
  }
  return { status: res.status, body };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return json(res, 204, {});
  }

  if (req.method !== 'POST' || req.url?.split('?')[0] !== '/brawl-api') {
    return json(res, 404, { error: { message: 'POST /brawl-api only' } });
  }

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8');
    const body = raw ? JSON.parse(raw) : {};
    const action = String(body.action || '');
    if (!ALLOWED.has(action)) {
      return json(res, 400, { error: { message: `Unknown action: ${action}` } });
    }

    let path = '';
    if (action === 'getPlayer') path = `/players/${encodeTag(body.playerTag)}`;
    else if (action === 'getBattlelog') path = `/players/${encodeTag(body.playerTag)}/battlelog`;
    else if (action === 'getClub') path = `/clubs/${encodeTag(body.clubTag)}`;
    else if (action === 'getClubMembers') path = `/clubs/${encodeTag(body.clubTag)}/members`;
    else if (action === 'getBrawlers') path = '/brawlers';
    else if (action === 'getEvents') path = '/events/rotation';

    const upstream = await bsFetch(path);
    if (upstream.status !== 200) {
      const msg = upstream.body?.message || `Brawl Stars API error (${upstream.status})`;
      return json(res, upstream.status, { error: { message: msg, status: upstream.status } });
    }
    return json(res, 200, { ok: true, action, data: upstream.body });
  } catch (err) {
    const status = err?.status || 500;
    return json(res, status, { error: { message: err?.message || 'Proxy error' } });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[brawl-proxy] http://127.0.0.1:${PORT}/brawl-api`);
  console.log('[brawl-proxy] Whitelist your public IP at developer.brawlstars.com');
});
