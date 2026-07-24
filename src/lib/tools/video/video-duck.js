/**
 * Audio ducking helpers — VO up, music down when overlapping.
 */

import { timelineDurationMs } from './video-speed.js';

/**
 * @typedef {Object} DuckSettings
 * @property {boolean} enabled
 * @property {number} amountDb
 * @property {number} attackMs
 * @property {number} releaseMs
 */

/** @returns {DuckSettings} */
export function defaultDuckSettings() {
  return {
    enabled: false,
    amountDb: 12,
    attackMs: 80,
    releaseMs: 200,
  };
}

/**
 * @param {Partial<DuckSettings> | null | undefined} value
 * @returns {DuckSettings}
 */
export function normalizeDuckSettings(value) {
  const base = defaultDuckSettings();
  if (!value || typeof value !== 'object') return base;
  return {
    enabled: Boolean(value.enabled),
    amountDb: Math.min(40, Math.max(0, Number(value.amountDb) || base.amountDb)),
    attackMs: Math.min(2000, Math.max(0, Number(value.attackMs) || base.attackMs)),
    releaseMs: Math.min(5000, Math.max(0, Number(value.releaseMs) || base.releaseMs)),
  };
}

/** @param {number} db */
export function dbToLinear(db) {
  return 10 ** (-Math.abs(db) / 20);
}

/**
 * @param {DuckSettings} duck
 * @param {boolean} voActive
 */
export function duckGainAtPlayhead(duck, voActive) {
  const d = normalizeDuckSettings(duck);
  if (!d.enabled || !voActive) return 1;
  return dbToLinear(d.amountDb);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {import('./video-project.js').VideoClip} clip
 */
function isVoClip(project, clip) {
  if (clip.audioRole === 'vo') return true;
  if (!clip.mediaId) return false;
  return Boolean(project.media.find((m) => m.id === clip.mediaId)?.fromVo);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {import('./video-project.js').VideoClip} clip
 */
function isMusicClip(project, clip) {
  if (clip.audioRole === 'music') return true;
  if (clip.audioRole === 'vo') return false;
  if (!clip.mediaId) return false;
  const media = project.media.find((m) => m.id === clip.mediaId);
  if (media?.fromVo) return false;
  return media?.kind === 'audio';
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @returns {Array<{ clipId: string, timelineStartMs: number, durationMs: number, gain: number }>}
 */
export function buildDuckEnvelopes(project) {
  const duck = normalizeDuckSettings(project.duck);
  if (!duck.enabled) return [];

  /** @type {Array<{ start: number, end: number }>} */
  const voWindows = [];
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (!isVoClip(project, clip)) continue;
      const start = clip.timelineStartMs;
      const end = start + timelineDurationMs(clip);
      voWindows.push({ start, end });
    }
  }

  /** @type {Array<{ clipId: string, timelineStartMs: number, durationMs: number, gain: number }>} */
  const envelopes = [];
  const gain = dbToLinear(duck.amountDb);
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (!isMusicClip(project, clip)) continue;
      const cStart = clip.timelineStartMs;
      const cEnd = cStart + timelineDurationMs(clip);
      for (const vo of voWindows) {
        const start = Math.max(cStart, vo.start);
        const end = Math.min(cEnd, vo.end);
        if (end > start) {
          envelopes.push({
            clipId: clip.id,
            timelineStartMs: start,
            durationMs: end - start,
            gain,
          });
        }
      }
    }
  }
  return envelopes;
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {number} playheadMs
 */
export function isVoActiveAtPlayhead(project, playheadMs) {
  for (const track of project.tracks) {
    if (track.muted || track.hidden) continue;
    for (const clip of track.clips) {
      if (!isVoClip(project, clip)) continue;
      const start = clip.timelineStartMs;
      const end = start + timelineDurationMs(clip);
      if (playheadMs >= start && playheadMs < end) return true;
    }
  }
  return false;
}
