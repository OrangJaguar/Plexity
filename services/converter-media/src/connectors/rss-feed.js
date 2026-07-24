import { config } from '../config.js';
import { QUOTAS } from '../quotas.js';
import { safeFetchStream } from '../ssrf.js';
import { createDiscoverResult } from './interface.js';

export const provider = 'rss-feed';

const FEED_EXTENSIONS = new Set(['.xml', '.rss', '.atom']);
const FEED_PATH_HINTS = ['/feed', '/rss', '/atom'];

function looksLikeFeedUrl(parsed) {
  const path = parsed.pathname.toLowerCase();
  if (FEED_EXTENSIONS.has(path.slice(path.lastIndexOf('.')))) return true;
  return FEED_PATH_HINTS.some((hint) => path.includes(hint));
}

function durationBucket(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return 'unknown';
  if (seconds < 60) return 'lt1m';
  if (seconds < 600) return '1to10m';
  if (seconds < 3600) return '10to60m';
  return 'gt60m';
}

function redactTitle(title) {
  const t = String(title || 'untitled').trim();
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

function decodeEntities(text) {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1].trim()) : '';
}

function extractEnclosureUrl(block) {
  const enc = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enc) return enc[1];
  const link = extractTag(block, 'link');
  return link || null;
}

function parseRssItems(xml, maxItems) {
  const items = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  const blocks = itemBlocks.length ? itemBlocks : entryBlocks;

  for (let i = 0; i < blocks.length && items.length < maxItems; i++) {
    const block = blocks[i];
    const title = extractTag(block, 'title') || `item-${i + 1}`;
    const guid = extractTag(block, 'guid') || extractTag(block, 'id') || `feed-${i + 1}`;
    const sourceUrl = extractEnclosureUrl(block);
    if (!sourceUrl) continue;
    try {
      const parsed = new URL(sourceUrl);
      if (parsed.protocol !== 'https:') continue;
    } catch {
      continue;
    }
    const durationRaw = extractTag(block, 'itunes:duration') || extractTag(block, 'duration');
    let durationSeconds;
    if (/^\d+$/.test(durationRaw)) durationSeconds = Number(durationRaw);
    else if (/^\d+:\d{2}(:\d{2})?$/.test(durationRaw)) {
      const parts = durationRaw.split(':').map(Number);
      durationSeconds = parts.length === 3
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + parts[1];
    }

    items.push({
      providerItemId: String(guid).slice(0, 200),
      title: redactTitle(title),
      durationSeconds,
      durationBucket: durationBucket(durationSeconds),
      sourceUrl,
      playlistIndex: items.length + 1,
      metadata: { feed: true, index: items.length + 1 },
    });
  }

  const truncated = blocks.length > maxItems;
  return { items, truncated };
}

export async function discover(url, opts = {}) {
  if (!config.enableFeedConnector) {
    const err = new Error('Feed connector disabled');
    err.code = 'PROVIDER_UNSUPPORTED';
    throw err;
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    const err = new Error('Invalid URL');
    err.code = 'URL_INVALID';
    throw err;
  }

  if (parsed.protocol !== 'https:') {
    const err = new Error('Only HTTPS feed URLs allowed');
    err.code = 'URL_DISALLOWED';
    throw err;
  }

  if (!looksLikeFeedUrl(parsed)) {
    const err = new Error('URL does not look like a feed');
    err.code = 'PROVIDER_UNSUPPORTED';
    throw err;
  }

  const maxItems = Math.min(opts.maxItems ?? QUOTAS.maxDiscoveryItems, QUOTAS.maxDiscoveryItems);
  const payload = await safeFetchStream(parsed.href, { maxBytes: 2 * 1024 * 1024, deadlineMs: 30_000 });
  const xml = payload.buffer.toString('utf8');
  const { items, truncated } = parseRssItems(xml, maxItems);

  if (!items.length) {
    const err = new Error('No HTTPS enclosures found in feed');
    err.code = 'DISCOVERY_EMPTY';
    throw err;
  }

  return createDiscoverResult({ items, truncated });
}

export async function resolve(url) {
  const err = new Error('Use discover() for feeds');
  err.code = 'PROVIDER_UNSUPPORTED';
  throw err;
}

export default { provider, discover, resolve };
