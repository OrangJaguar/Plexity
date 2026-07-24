/**
 * Clip speed helpers for Video Plan 3.
 */

export const VIDEO_SPEED_MIN = 0.25;
export const VIDEO_SPEED_MAX = 4;

/**
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeSpeed(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(VIDEO_SPEED_MAX, Math.max(VIDEO_SPEED_MIN, Math.round(n * 100) / 100));
}

/**
 * Source window length in ms (in→out), independent of speed.
 * @param {{ sourceInMs: number, sourceOutMs: number }} clip
 */
export function sourceWindowMs(clip) {
  return Math.max(0, clip.sourceOutMs - clip.sourceInMs);
}

/**
 * Timeline duration accounting for speed (faster = shorter on timeline).
 * @param {{ sourceInMs: number, sourceOutMs: number, speed?: number, freeze?: boolean }} clip
 */
export function timelineDurationMs(clip) {
  const src = sourceWindowMs(clip);
  if (clip.freeze) return Math.max(1, src); // freeze uses sourceOut-in as hold length at speed 1 semantics
  const speed = normalizeSpeed(clip.speed ?? 1);
  return Math.max(1, Math.round(src / speed));
}

/**
 * Map playhead → source time (seconds) within clip.
 * @param {{ timelineStartMs: number, sourceInMs: number, sourceOutMs: number, speed?: number, reverse?: boolean, freeze?: boolean }} clip
 * @param {number} playheadMs
 */
export function sourceTimeSecAtPlayhead(clip, playheadMs) {
  const local = Math.max(0, playheadMs - clip.timelineStartMs);
  const speed = normalizeSpeed(clip.speed ?? 1);
  const srcWin = sourceWindowMs(clip);
  if (clip.freeze) {
    return clip.sourceInMs / 1000;
  }
  let intoSource = local * speed;
  if (clip.reverse) {
    intoSource = Math.max(0, srcWin - intoSource);
  }
  intoSource = Math.min(srcWin, intoSource);
  return (clip.sourceInMs + intoSource) / 1000;
}

/**
 * Build chained atempo filters for factor in [0.25, 4] (each atempo must be 0.5–2).
 * @param {number} speed
 * @returns {string[]}
 */
export function atempoChain(speed) {
  let remaining = normalizeSpeed(speed);
  /** @type {string[]} */
  const parts = [];
  // Slow down: repeatedly *0.5 until in range, or speed up *2
  while (remaining < 0.5 - 1e-6) {
    parts.push('atempo=0.5');
    remaining /= 0.5;
  }
  while (remaining > 2 + 1e-6) {
    parts.push('atempo=2.0');
    remaining /= 2;
  }
  parts.push(`atempo=${remaining.toFixed(4)}`);
  return parts;
}

/**
 * FFmpeg video filter fragments for speed/reverse/freeze.
 * @param {{ speed?: number, reverse?: boolean, freeze?: boolean, sourceInMs: number, sourceOutMs: number }} clip
 * @returns {{ vf: string[], af: string[] }}
 */
export function ffmpegSpeedFilters(clip) {
  const speed = normalizeSpeed(clip.speed ?? 1);
  /** @type {string[]} */
  const vf = [];
  /** @type {string[]} */
  const af = [];

  if (clip.freeze) {
    vf.push('loop=loop=-1:size=1:start=0', `trim=duration=${(sourceWindowMs(clip) / 1000).toFixed(3)}`, 'setpts=PTS-STARTPTS');
    return { vf, af };
  }
  if (clip.reverse) {
    vf.push('reverse');
    af.push('areverse');
  }
  if (Math.abs(speed - 1) > 0.001) {
    vf.push(`setpts=${(1 / speed).toFixed(6)}*PTS`);
    af.push(...atempoChain(speed));
  }
  return { vf, af };
}
