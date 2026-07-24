/**
 * Runtime feature flags for converter capabilities.
 * Each flag can be overridden via import.meta.env in build tooling
 * (e.g. VITE_CONVERTER_ENABLE_FFMPEG=false).
 */

/**
 * @param {string | undefined} envValue
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
function resolveFlag(envValue, defaultValue) {
  if (envValue === 'false' || envValue === false) return false;
  if (envValue === 'true' || envValue === true) return true;
  return defaultValue;
}

const env = typeof import.meta !== 'undefined' ? import.meta.env ?? {} : {};

/**
 * @typedef {object} ConverterFeatureFlags
 * @property {boolean} ENABLE_FFMPEG
 * @property {boolean} ENABLE_V2_TWO_PASS
 * @property {boolean} ENABLE_V2_MERGE_SPLIT
 * @property {boolean} ENABLE_V2_ADVANCED_FFMPEG
 * @property {boolean} ENABLE_V2_TARGET_SIZE
 * @property {boolean} ENABLE_V2_RECIPES
 */

/** @type {ConverterFeatureFlags} */
export const CONVERTER_FEATURE_FLAGS = Object.freeze({
  ENABLE_FFMPEG: resolveFlag(env.VITE_CONVERTER_ENABLE_FFMPEG, true),
  ENABLE_V2_TWO_PASS: resolveFlag(env.VITE_CONVERTER_ENABLE_V2_TWO_PASS, true),
  ENABLE_V2_MERGE_SPLIT: resolveFlag(env.VITE_CONVERTER_ENABLE_V2_MERGE_SPLIT, true),
  ENABLE_V2_ADVANCED_FFMPEG: resolveFlag(env.VITE_CONVERTER_ENABLE_V2_ADVANCED_FFMPEG, true),
  ENABLE_V2_TARGET_SIZE: resolveFlag(env.VITE_CONVERTER_ENABLE_V2_TARGET_SIZE, true),
  ENABLE_V2_RECIPES: resolveFlag(env.VITE_CONVERTER_ENABLE_V2_RECIPES, true),
});
