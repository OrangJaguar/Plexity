import { config } from '../config.js';
import { validateUrlShape } from '../ssrf.js';
import { createConnectorResult } from './interface.js';

export const provider = 'youtube-single';

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'www.youtu.be',
]);

function extractVideoId(parsed) {
  const host = parsed.hostname.toLowerCase();
  const path = parsed.pathname;
  if (path.includes('/playlist') || parsed.searchParams.has('list')) return null;
  if (path.includes('/channel/') || path.includes('/c/') || path.includes('/@') || path.includes('/user/')) {
    return null;
  }
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    return path.replace(/^\//, '').split('/')[0] || null;
  }
  if (path === '/watch') return parsed.searchParams.get('v');
  if (path.startsWith('/shorts/')) return path.slice('/shorts/'.length).split('/')[0] || null;
  if (path.startsWith('/embed/')) return path.slice('/embed/'.length).split('/')[0] || null;
  return null;
}

export async function resolve(url) {
  if (!config.enableYoutubeConnector) {
    const err = new Error('YouTube connector disabled');
    err.code = 'PROVIDER_UNSUPPORTED';
    throw err;
  }

  const parsed = validateUrlShape(url);
  const host = parsed.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) {
    const err = new Error('Not a YouTube URL');
    err.code = 'PROVIDER_UNSUPPORTED';
    throw err;
  }

  const videoId = extractVideoId(parsed);
  if (!videoId || !/^[a-zA-Z0-9_-]{6,20}$/.test(videoId)) {
    const err = new Error('Unsupported YouTube URL shape');
    err.code = 'PROVIDER_UNSUPPORTED';
    throw err;
  }

  return createConnectorResult({
    provider,
    resolvedUrl: parsed.href,
    metadata: {
      videoId,
      ytdlpArgs: ['--no-playlist', '-f', 'best[ext=mp4]/best', '-o', '-'],
    },
  });
}

export default { provider, resolve };
