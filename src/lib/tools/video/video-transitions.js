/**
 * Clip-to-clip transitions (stored on outgoing clip).
 */

/** @typedef {'none'|'dissolve'|'wipe'|'slide'} VideoTransitionType */

/**
 * @typedef {Object} VideoTransition
 * @property {VideoTransitionType} type
 * @property {number} durationMs
 */

export const VIDEO_TRANSITION_TYPES = Object.freeze([
  { id: 'none', label: 'None' },
  { id: 'dissolve', label: 'Dissolve' },
  { id: 'wipe', label: 'Wipe' },
  { id: 'slide', label: 'Slide' },
]);

export const VIDEO_TRANSITION_DEFAULT_MS = 500;

/** @returns {VideoTransition} */
export function defaultTransition() {
  return { type: 'none', durationMs: VIDEO_TRANSITION_DEFAULT_MS };
}

/**
 * @param {Partial<VideoTransition> | null | undefined} value
 * @returns {VideoTransition}
 */
export function normalizeTransition(value) {
  const base = defaultTransition();
  if (!value || typeof value !== 'object') return base;
  const type = VIDEO_TRANSITION_TYPES.some((t) => t.id === value.type) ? value.type : 'none';
  const durationMs = Math.max(100, Math.min(3000, Number(value.durationMs) || base.durationMs));
  return { type: /** @type {VideoTransitionType} */ (type), durationMs };
}

/** @param {VideoTransition | null | undefined} t */
export function hasTransition(t) {
  return Boolean(t && t.type && t.type !== 'none');
}

/**
 * Map to FFmpeg xfade transition name.
 * @param {VideoTransitionType} type
 */
export function xfadeNameForType(type) {
  if (type === 'wipe') return 'wipeleft';
  if (type === 'slide') return 'slideleft';
  if (type === 'dissolve') return 'fade';
  return 'fade';
}
