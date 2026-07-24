import dns from 'node:dns/promises';
import net from 'node:net';
import { QUOTAS } from './quotas.js';

const MAX_REDIRECTS = 3;

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^fd/i,
];

export class SsrfError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'SsrfError';
  }
}

function isIpLiteral(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(':')) return true;
  if (host.startsWith('[') && host.endsWith(']')) return true;
  return false;
}

function normalizeHost(host) {
  if (host.startsWith('[') && host.endsWith(']')) return host.slice(1, -1);
  return host.toLowerCase();
}

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    return PRIVATE_RANGES.some((re) => re.test(ip));
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')) return true;
  }
  return false;
}

export function validateUrlShape(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new SsrfError('URL_INVALID', 'URL is required');
  }
  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new SsrfError('URL_INVALID', 'Malformed URL');
  }
  if (parsed.protocol !== 'https:') {
    throw new SsrfError('URL_DISALLOWED', 'Only HTTPS URLs are allowed');
  }
  if (parsed.username || parsed.password) {
    throw new SsrfError('URL_DISALLOWED', 'Credentials in URL are not allowed');
  }
  if (parsed.port && parsed.port !== '443') {
    throw new SsrfError('URL_DISALLOWED', 'Non-standard ports are not allowed');
  }
  const host = normalizeHost(parsed.hostname);
  if (isIpLiteral(host)) {
    throw new SsrfError('SSRF_BLOCKED', 'IP literal hosts are not allowed');
  }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new SsrfError('SSRF_BLOCKED', 'Local/internal hosts are not allowed');
  }
  return parsed;
}

export async function resolveAndPinHost(parsedUrl) {
  const host = normalizeHost(parsedUrl.hostname);
  let records;
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SsrfError('SSRF_BLOCKED', 'DNS resolution failed');
  }
  if (!records.length) {
    throw new SsrfError('SSRF_BLOCKED', 'No DNS records');
  }

  const pinned = [];
  for (const rec of records) {
    if (isPrivateIp(rec.address)) {
      throw new SsrfError('SSRF_BLOCKED', 'Resolved to private range');
    }
    pinned.push({ address: rec.address, family: rec.family });
  }
  return { host, pinned, port: parsedUrl.port || '443', path: parsedUrl.pathname + parsedUrl.search };
}

export function stripAuthOnRedirect(currentUrl, nextUrl) {
  const cur = new URL(currentUrl);
  const next = new URL(nextUrl);
  if (cur.origin !== next.origin) {
    next.username = '';
    next.password = '';
  }
  return next;
}

export async function validateRedirectChain(startUrl) {
  const chain = [];
  let current = validateUrlShape(startUrl);

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const pin = await resolveAndPinHost(current);
    chain.push({ url: current.href, pin });

    if (i === MAX_REDIRECTS) {
      throw new SsrfError('FETCH_REDIRECT_LIMIT', 'Too many redirects');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let res;
    try {
      res = await fetch(current.href, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      });
    } catch {
      // Some origins reject HEAD; fall through without following further here.
      clearTimeout(timer);
      break;
    } finally {
      clearTimeout(timer);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) break;
      let next = new URL(location, current.href);
      next = stripAuthOnRedirect(current.href, next.href);
      current = validateUrlShape(next.href);
      continue;
    }
    break;
  }

  return chain;
}

/**
 * Streamed fetch with byte cap and deadline through optional dispatcher (egress proxy).
 */
export async function safeFetchStream(url, { dispatcher, maxBytes = QUOTAS.maxInputBytes, deadlineMs = 120_000 } = {}) {
  const chain = await validateRedirectChain(url);
  const final = chain[chain.length - 1];
  const pinnedIp = final.pin[0]?.address;

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), deadlineMs);

  const headers = { 'user-agent': 'PlexityConverterMedia/1.0' };
  if (pinnedIp) {
    headers.host = final.url.hostname;
  }

  let res;
  try {
    res = await fetch(final.url.href, {
      redirect: 'manual',
      signal: controller.signal,
      dispatcher,
      headers,
    });
  } catch (err) {
    clearTimeout(deadline);
    if (err.name === 'AbortError') throw new SsrfError('FETCH_TIMEOUT', 'Fetch deadline exceeded');
    throw new SsrfError('FETCH_NETWORK', err.message || 'Network error');
  }

  if (res.status >= 300 && res.status < 400) {
    clearTimeout(deadline);
    throw new SsrfError('FETCH_REDIRECT_LIMIT', 'Unexpected redirect at fetch time');
  }
  if (!res.ok) {
    clearTimeout(deadline);
    if (res.status >= 500) throw new SsrfError('FETCH_UPSTREAM_5XX', `Upstream ${res.status}`);
    throw new SsrfError('FETCH_UPSTREAM_4XX', `Upstream ${res.status}`);
  }

  const contentLength = Number(res.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    clearTimeout(deadline);
    throw new SsrfError('QUOTA_EXCEEDED', 'Content-Length exceeds input cap');
  }

  const reader = res.body?.getReader();
  if (!reader) {
    clearTimeout(deadline);
    throw new SsrfError('FETCH_NETWORK', 'Empty response body');
  }

  let received = 0;
  const chunks = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new SsrfError('QUOTA_EXCEEDED', 'Stream exceeded input cap');
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(deadline);
  }

  return {
    buffer: Buffer.concat(chunks.map((c) => Buffer.from(c))),
    contentType: res.headers.get('content-type') || 'application/octet-stream',
    byteSize: received,
  };
}
