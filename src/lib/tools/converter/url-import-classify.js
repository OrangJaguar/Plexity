/**
 * Classify Authorized URL Import entries (Plans 5–6).
 */

/**
 * @typedef {'direct-https' | 'youtube-single' | 'youtube-playlist' | 'youtube-channel' | 'rss-feed' | 'playlist-deferred' | 'channel-deferred' | 'invalid'} UrlImportProvider
 */

/**
 * @typedef {{
 *   allowPlaylist?: boolean,
 *   allowFeed?: boolean,
 * }} ClassifyImportOptions
 */

/**
 * @typedef {{
 *   provider: UrlImportProvider,
 *   reason?: string,
 *   youtubeVideoId?: string | null,
 *   playlistId?: string | null,
 * }} UrlClassification
 */

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

/**
 * @param {string} rawUrl
 * @param {ClassifyImportOptions} [opts]
 * @returns {UrlClassification}
 */
export function classifyImportUrl(rawUrl, opts = {}) {
  const allowPlaylist = opts.allowPlaylist === true;
  const allowFeed = opts.allowFeed === true;

  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { provider: 'invalid', reason: 'URL_INVALID', youtubeVideoId: null, playlistId: null };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { provider: 'invalid', reason: 'URL_INVALID', youtubeVideoId: null, playlistId: null };
  }

  if (parsed.protocol !== 'https:') {
    return { provider: 'invalid', reason: 'URL_DISALLOWED', youtubeVideoId: null, playlistId: null };
  }

  if (parsed.username || parsed.password) {
    return { provider: 'invalid', reason: 'URL_DISALLOWED', youtubeVideoId: null, playlistId: null };
  }

  if (parsed.port && parsed.port !== '443') {
    return { provider: 'invalid', reason: 'URL_DISALLOWED', youtubeVideoId: null, playlistId: null };
  }

  const host = parsed.hostname.toLowerCase();
  if (isIpLiteral(host)) {
    return { provider: 'invalid', reason: 'SSRF_BLOCKED', youtubeVideoId: null, playlistId: null };
  }

  if (YOUTUBE_HOSTS.has(host)) {
    return classifyYouTube(parsed, allowPlaylist);
  }

  if (looksLikeFeed(parsed)) {
    if (allowFeed) {
      return { provider: 'rss-feed', youtubeVideoId: null, playlistId: null };
    }
    return { provider: 'playlist-deferred', reason: 'FEED_UNSUPPORTED', youtubeVideoId: null, playlistId: null };
  }

  return { provider: 'direct-https', youtubeVideoId: null, playlistId: null };
}

/**
 * @param {URL} parsed
 * @param {boolean} allowPlaylist
 * @returns {UrlClassification}
 */
function classifyYouTube(parsed, allowPlaylist) {
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;

  const isChannel = path.includes('/channel/')
    || path.includes('/c/')
    || path.includes('/@')
    || path.includes('/user/');
  const isPlaylist = path.includes('/playlist')
    || (parsed.searchParams.has('list') && !parsed.searchParams.get('v'))
    || path.includes('/feeds/');

  if (isChannel) {
    if (allowPlaylist) {
      return { provider: 'youtube-channel', youtubeVideoId: null, playlistId: null };
    }
    return { provider: 'channel-deferred', reason: 'PLAYLIST_DEFERRED', youtubeVideoId: null, playlistId: null };
  }

  if (isPlaylist || (parsed.searchParams.has('list') && path === '/watch' && allowPlaylist && !parsed.searchParams.get('v'))) {
    const playlistId = parsed.searchParams.get('list');
    if (allowPlaylist) {
      return {
        provider: 'youtube-playlist',
        youtubeVideoId: null,
        playlistId: playlistId && /^[a-zA-Z0-9_-]{10,64}$/.test(playlistId) ? playlistId : null,
      };
    }
    return { provider: 'playlist-deferred', reason: 'PLAYLIST_DEFERRED', youtubeVideoId: null, playlistId: null };
  }

  // Watch URL with both v and list: treat as single video unless playlist mode prefers list-only URLs.
  if (parsed.searchParams.has('list') && path.includes('/playlist')) {
    if (allowPlaylist) {
      return {
        provider: 'youtube-playlist',
        youtubeVideoId: null,
        playlistId: parsed.searchParams.get('list'),
      };
    }
    return { provider: 'playlist-deferred', reason: 'PLAYLIST_DEFERRED', youtubeVideoId: null, playlistId: null };
  }

  let videoId = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    videoId = path.replace(/^\//, '').split('/')[0] || null;
  } else if (path === '/watch') {
    videoId = parsed.searchParams.get('v');
  } else if (path.startsWith('/shorts/')) {
    videoId = path.slice('/shorts/'.length).split('/')[0] || null;
  } else if (path.startsWith('/embed/')) {
    videoId = path.slice('/embed/'.length).split('/')[0] || null;
  }

  if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    if (parsed.searchParams.has('list')) {
      if (allowPlaylist) {
        return {
          provider: 'youtube-playlist',
          youtubeVideoId: null,
          playlistId: parsed.searchParams.get('list'),
        };
      }
      return { provider: 'playlist-deferred', reason: 'PLAYLIST_DEFERRED', youtubeVideoId: null, playlistId: null };
    }
    return { provider: 'invalid', reason: 'PROVIDER_UNSUPPORTED', youtubeVideoId: null, playlistId: null };
  }

  return { provider: 'youtube-single', youtubeVideoId: videoId, playlistId: null };
}

/**
 * @param {URL} parsed
 */
function looksLikeFeed(parsed) {
  const path = parsed.pathname.toLowerCase();
  if (path.endsWith('.xml') || path.endsWith('.rss') || path.endsWith('.atom')) return true;
  if (path.includes('/feed') || path.includes('/rss') || path.includes('/atom')) return true;
  return false;
}

/**
 * @param {string} host
 */
function isIpLiteral(host) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.includes(':')) return true;
  if (host.startsWith('[') && host.endsWith(']')) return true;
  return false;
}

/**
 * Providers that can be submitted as single-URL Plan 5 jobs.
 * @param {UrlImportProvider} provider
 */
export function isAcceptedProvider(provider) {
  return provider === 'direct-https' || provider === 'youtube-single';
}

/**
 * Providers that require Plan 6 discovery when enabled.
 * @param {UrlImportProvider} provider
 */
export function isDiscoveryProvider(provider) {
  return provider === 'youtube-playlist'
    || provider === 'youtube-channel'
    || provider === 'rss-feed';
}

/**
 * @param {UrlImportProvider} provider
 */
export function isDeferredProvider(provider) {
  return provider === 'playlist-deferred' || provider === 'channel-deferred';
}
