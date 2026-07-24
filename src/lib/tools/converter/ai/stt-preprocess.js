/**
 * STT size/duration quota helpers (shared client + server mirror).
 */

import { AI_ERROR_CODES, AI_QUOTAS } from './ai-quotas.js';

/**
 * @param {{ byteLength: number, durationSeconds?: number, isVideo?: boolean }} input
 */
export function assertSttLimits(input) {
  const bytes = Number(input.byteLength) || 0;
  const duration = Number(input.durationSeconds);
  const isVideo = Boolean(input.isVideo);
  const maxBytes = isVideo ? AI_QUOTAS.maxSttVideoBytes : AI_QUOTAS.maxSttAudioBytes;
  const maxSeconds = isVideo ? AI_QUOTAS.maxSttVideoSeconds : AI_QUOTAS.maxSttAudioSeconds;

  if (bytes > maxBytes) {
    return { ok: false, code: AI_ERROR_CODES.AI_UPLOAD_TOO_LARGE };
  }
  if (Number.isFinite(duration) && duration > maxSeconds) {
    return { ok: false, code: AI_ERROR_CODES.AI_DURATION_LIMIT };
  }
  return { ok: true, code: null };
}

/**
 * Whether video should be demuxed to audio before STT.
 * @param {string} [mimeType]
 */
export function shouldExtractAudioTrack(mimeType) {
  return String(mimeType || '').startsWith('video/');
}
