/**
 * Clip filter / color presets for Video Plan 2.
 */

/**
 * @typedef {Object} VideoFilterParams
 * @property {string | null} presetId
 * @property {number} brightness  -1..1
 * @property {number} contrast    -1..1
 * @property {number} saturation  -1..1
 */

/** @returns {VideoFilterParams} */
export function defaultVideoFilter() {
  return {
    presetId: null,
    brightness: 0,
    contrast: 0,
    saturation: 0,
  };
}

/**
 * @param {Partial<VideoFilterParams> | null | undefined} value
 * @returns {VideoFilterParams}
 */
export function normalizeVideoFilter(value) {
  const base = defaultVideoFilter();
  if (!value || typeof value !== 'object') return base;
  const clamp = (n) => Math.min(1, Math.max(-1, Number.isFinite(Number(n)) ? Number(n) : 0));
  return {
    presetId: value.presetId == null ? null : String(value.presetId),
    brightness: clamp(value.brightness ?? base.brightness),
    contrast: clamp(value.contrast ?? base.contrast),
    saturation: clamp(value.saturation ?? base.saturation),
  };
}

/** @param {VideoFilterParams} f */
export function isIdentityFilter(f) {
  const n = normalizeVideoFilter(f);
  return !n.presetId && n.brightness === 0 && n.contrast === 0 && n.saturation === 0;
}

export const VIDEO_FILTER_PRESETS = Object.freeze([
  { id: 'none', label: 'None', params: { brightness: 0, contrast: 0, saturation: 0 } },
  { id: 'vivid', label: 'Vivid', params: { brightness: 0.05, contrast: 0.15, saturation: 0.25 } },
  { id: 'warm', label: 'Warm', params: { brightness: 0.05, contrast: 0.05, saturation: 0.1 } },
  { id: 'cool', label: 'Cool', params: { brightness: 0, contrast: 0.05, saturation: -0.05 } },
  { id: 'mono', label: 'Mono', params: { brightness: 0, contrast: 0.1, saturation: -1 } },
  { id: 'fade', label: 'Fade', params: { brightness: 0.1, contrast: -0.15, saturation: -0.2 } },
]);

/**
 * @param {string} presetId
 * @returns {VideoFilterParams}
 */
export function filterFromPreset(presetId) {
  const p = VIDEO_FILTER_PRESETS.find((x) => x.id === presetId);
  if (!p || p.id === 'none') return defaultVideoFilter();
  return normalizeVideoFilter({ presetId: p.id, ...p.params });
}

/**
 * CSS filter string for preview.
 * @param {VideoFilterParams | null | undefined} filter
 */
export function cssFilterFromParams(filter) {
  const f = normalizeVideoFilter(filter);
  if (isIdentityFilter(f)) return 'none';
  const b = 1 + f.brightness;
  const c = 1 + f.contrast;
  const s = 1 + f.saturation;
  return `brightness(${b}) contrast(${c}) saturate(${s})`;
}

/**
 * FFmpeg eq filter fragment (no commas wrapping).
 * brightness/contrast/saturation mapped roughly to eq.
 * @param {VideoFilterParams | null | undefined} filter
 * @returns {string | null}
 */
export function ffmpegEqFromParams(filter) {
  const f = normalizeVideoFilter(filter);
  if (isIdentityFilter(f)) return null;
  // eq: brightness -1..1, contrast 0..2 (1 = identity), saturation 0..3 (1 = identity)
  const brightness = f.brightness;
  const contrast = 1 + f.contrast;
  const saturation = 1 + f.saturation;
  return `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`;
}
