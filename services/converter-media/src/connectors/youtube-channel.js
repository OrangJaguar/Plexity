import { spawn } from 'node:child_process';
import { config } from '../config.js';
import { QUOTAS } from '../quotas.js';
import { createDiscoverResult } from './interface.js';

export const provider = 'youtube-channel';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
]);

const REJECT_PATHS = ['/live', '/streams', '/members', '/membership', '/shorts/live'];

function isChannelUrl(parsed) {
  const path = parsed.pathname.toLowerCase();
  return path.includes('/channel/')
    || path.includes('/c/')
    || path.startsWith('/@')
    || path.includes('/user/');
}

function isUploadsTab(parsed) {
  const path = parsed.pathname.toLowerCase();
  if (path.endsWith('/videos') || path.endsWith('/featured')) return true;
  if (isChannelUrl(parsed) && !path.includes('/playlists') && !path.includes('/community')) return true;
  return false;
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

function normalizeChannelUploadsUrl(url) {
  const parsed = new URL(url.trim());
  const path = parsed.pathname.replace(/\/+$/, '');
  const lower = path.toLowerCase();

  for (const reject of REJECT_PATHS) {
    if (lower.includes(reject)) {
      const err = new Error('Channel mode not allowed for live/members content');
      err.code = 'PROVIDER_UNSUPPORTED';
      throw err;
    }
  }

  if (lower.endsWith('/videos')) return parsed.href;
  if (isChannelUrl(parsed)) {
    parsed.pathname = `${path}/videos`;
    return parsed.href;
  }

  const err = new Error('Not a channel uploads URL');
  err.code = 'PROVIDER_UNSUPPORTED';
  throw err;
}

async function runYtdlpChannel(url, maxItems) {
  const args = [
    '--flat-playlist',
    '--no-download',
    '--dump-single-json',
    '--playlist-end', String(maxItems + 1),
    url,
  ];

  return new Promise((resolve, reject) => {
    const chunks = [];
    const proc = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', (buf) => chunks.push(buf));
    proc.stderr.on('data', () => {});
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(Object.assign(new Error(`yt-dlp exited ${code}`), { code: 'DISCOVERY_UPSTREAM' }));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8').trim()));
      } catch {
        reject(Object.assign(new Error('Invalid yt-dlp JSON'), { code: 'DISCOVERY_PARSE' }));
      }
    });
  });
}

export async function discover(url, opts = {}) {
  if (!config.enableYoutubeConnector) {
    const err = new Error('YouTube connector disabled');
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

  if (!YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
    const err = new Error('Not a YouTube URL');
    err.code = 'PROVIDER_UNSUPPORTED';
    throw err;
  }

  if (!isUploadsTab(parsed)) {
    const err = new Error('Only channel uploads listing is supported');
    err.code = 'PROVIDER_UNSUPPORTED';
    throw err;
  }

  const uploadsUrl = normalizeChannelUploadsUrl(url);
  const maxItems = Math.min(opts.maxItems ?? QUOTAS.maxDiscoveryItems, QUOTAS.maxDiscoveryItems);
  const data = await runYtdlpChannel(uploadsUrl, maxItems);

  const rawEntries = (Array.isArray(data.entries) ? data.entries : []).filter((entry) => {
    const title = String(entry.title || '').toLowerCase();
    if (entry.live_status === 'is_live' || entry.is_live) return false;
    if (title.includes('[live]') || title.includes('members only')) return false;
    return true;
  });

  const truncated = rawEntries.length > maxItems;
  const slice = rawEntries.slice(0, maxItems);

  const items = slice.map((entry, idx) => {
    const videoId = entry.id || entry.url?.split('v=')[1]?.split('&')[0] || `item-${idx}`;
    const watchUrl = entry.url || entry.webpage_url || `https://www.youtube.com/watch?v=${videoId}`;
    return {
      providerItemId: String(videoId),
      title: redactTitle(entry.title),
      durationSeconds: typeof entry.duration === 'number' ? entry.duration : undefined,
      durationBucket: durationBucket(entry.duration),
      sourceUrl: watchUrl,
      playlistIndex: idx + 1,
      metadata: { provider: provider, index: idx + 1, channel: true },
    };
  });

  return createDiscoverResult({ items, truncated });
}

export async function resolve(url) {
  const err = new Error('Use discover() for channels');
  err.code = 'PROVIDER_UNSUPPORTED';
  throw err;
}

export default { provider, discover, resolve };
