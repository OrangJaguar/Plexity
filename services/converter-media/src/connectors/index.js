import { config } from '../config.js';
import directHttps from './direct-https.js';
import youtubeSingle from './youtube-single.js';
import youtubePlaylist from './youtube-playlist.js';
import youtubeChannel from './youtube-channel.js';
import rssFeed from './rss-feed.js';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

function parseUrl(url) {
  try {
    return new URL(url.trim());
  } catch {
    return null;
  }
}

function isPlaylistUrl(parsed) {
  const path = parsed.pathname.toLowerCase();
  if (path.includes('/playlist')) return true;
  if (parsed.searchParams.has('list') && !parsed.searchParams.get('v')) return true;
  if (path === '/watch' && parsed.searchParams.has('list') && parsed.searchParams.get('v')) return false;
  return parsed.searchParams.has('list') && path !== '/watch';
}

function isChannelUrl(parsed) {
  const path = parsed.pathname.toLowerCase();
  return path.includes('/channel/')
    || path.includes('/c/')
    || path.startsWith('/@')
    || path.includes('/user/');
}

function looksLikeFeedUrl(parsed) {
  const path = parsed.pathname.toLowerCase();
  if (path.endsWith('.xml') || path.endsWith('.rss') || path.endsWith('.atom')) return true;
  return ['/feed', '/rss', '/atom'].some((hint) => path.includes(hint));
}

export function classifyProvider(url) {
  const parsed = parseUrl(url);
  if (!parsed) return 'invalid';

  if (YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
    if (isPlaylistUrl(parsed)) return 'youtube-playlist';
    if (isChannelUrl(parsed)) return 'youtube-channel';
    return 'youtube-single';
  }

  if (config.enableFeedConnector && looksLikeFeedUrl(parsed)) {
    return 'rss-feed';
  }

  return 'direct-https';
}

export function classifyDiscoveryProvider(url) {
  const kind = classifyProvider(url);
  if (['youtube-playlist', 'youtube-channel', 'rss-feed'].includes(kind)) return kind;
  return null;
}

export async function resolveSource(url) {
  const kind = classifyProvider(url);
  if (kind === 'youtube-single') return youtubeSingle.resolve(url);
  if (kind === 'direct-https') return directHttps.resolve(url);
  const err = new Error('Unsupported URL for single-source resolve');
  err.code = 'URL_INVALID';
  throw err;
}

export async function discoverSource(url, opts = {}) {
  const kind = classifyDiscoveryProvider(url);
  if (kind === 'youtube-playlist') return youtubePlaylist.discover(url, opts);
  if (kind === 'youtube-channel') return youtubeChannel.discover(url, opts);
  if (kind === 'rss-feed') return rssFeed.discover(url, opts);
  const err = new Error('URL does not support discovery');
  err.code = 'PROVIDER_UNSUPPORTED';
  throw err;
}

export {
  directHttps,
  youtubeSingle,
  youtubePlaylist,
  youtubeChannel,
  rssFeed,
};
