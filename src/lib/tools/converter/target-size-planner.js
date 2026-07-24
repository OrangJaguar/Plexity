/**
 * Plans an approximate bitrate/pass strategy for hitting a target output
 * size. Estimates are always approximate — container overhead, variable
 * bitrate encoding, and source complexity make exact sizes unreliable.
 */

import { CONVERTER_FEATURE_FLAGS } from './converter-feature-flags.js';

/** @typedef {'audio' | 'video' | 'image' | 'data'} ConverterCategory */
/** @typedef {'one' | 'two' | 'auto'} PassStrategy */
/** @typedef {'low' | 'medium' | 'high'} UncertaintyLevel */

/**
 * @typedef {object} TargetSizePlanResult
 * @property {number | null} bitrateKbps
 * @property {PassStrategy} passStrategy
 * @property {number} estimatedBytes
 * @property {UncertaintyLevel} uncertainty
 * @property {ReadonlyArray<string>} warnings
 */

/** @type {Readonly<Record<'audio' | 'video', { min: number, max: number }>>} */
const BITRATE_CLAMPS = Object.freeze({
  audio: Object.freeze({ min: 32, max: 320 }),
  video: Object.freeze({ min: 100, max: 20000 }),
});

const DEFAULT_VIDEO_AUDIO_ALLOCATION_KBPS = 128;
const CONTAINER_OVERHEAD_RATIO = 0.02;

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {object} params
 * @param {ConverterCategory} params.category
 * @param {number | null} [params.durationSec]
 * @param {number} params.sourceBytes
 * @param {number} params.targetBytes
 * @param {number} [params.toleranceRatio]
 * @param {boolean} [params.allowTwoPass]
 * @returns {TargetSizePlanResult | null}
 */
export function planTargetSize(params) {
  if (!CONVERTER_FEATURE_FLAGS.ENABLE_V2_TARGET_SIZE) return null;

  const {
    category,
    durationSec = null,
    // sourceBytes is part of the public signature for symmetry with
    // output-estimate.js, but the target-size math only depends on the
    // requested targetBytes/duration, not the source size.
    sourceBytes: _sourceBytes,
    targetBytes,
    toleranceRatio = 0.12,
    allowTwoPass = true,
  } = params;

  const warnings = ['TARGET_SIZE_APPROX'];
  const safeTargetBytes = Number.isFinite(targetBytes) && targetBytes > 0 ? targetBytes : 0;

  if ((category !== 'audio' && category !== 'video') || !Number.isFinite(durationSec) || durationSec <= 0) {
    warnings.push('ESTIMATE_UNCERTAIN');
    return {
      bitrateKbps: null,
      passStrategy: 'one',
      estimatedBytes: safeTargetBytes,
      uncertainty: 'high',
      warnings: Object.freeze([...new Set(warnings)]),
    };
  }

  const usableBytes = safeTargetBytes * (1 - CONTAINER_OVERHEAD_RATIO);
  const totalBudgetKbps = (usableBytes * 8) / 1000 / durationSec;

  const audioAllocationKbps = category === 'video' ? Math.min(DEFAULT_VIDEO_AUDIO_ALLOCATION_KBPS, totalBudgetKbps * 0.25) : 0;
  const rawBitrateKbps = category === 'video' ? totalBudgetKbps - audioAllocationKbps : totalBudgetKbps;

  const clamps = BITRATE_CLAMPS[category];
  const bitrateKbps = Math.round(clamp(rawBitrateKbps, clamps.min, clamps.max));
  const wasClamped = Math.abs(bitrateKbps - rawBitrateKbps) > 1;
  if (wasClamped) warnings.push('ESTIMATE_UNCERTAIN');

  const twoPassEligible = CONVERTER_FEATURE_FLAGS.ENABLE_V2_TWO_PASS && allowTwoPass;
  const passStrategy = twoPassEligible && toleranceRatio <= 0.1 ? 'two' : 'one';
  if (passStrategy === 'two') warnings.push('TWO_PASS');

  const totalBitrateKbps = bitrateKbps + audioAllocationKbps;
  const estimatedBytes = Math.round((totalBitrateKbps * 1000 * durationSec) / 8 / (1 - CONTAINER_OVERHEAD_RATIO));

  const deviationRatio = safeTargetBytes > 0 ? Math.abs(estimatedBytes - safeTargetBytes) / safeTargetBytes : 1;
  let uncertainty = passStrategy === 'two' ? 'low' : 'medium';
  if (wasClamped || deviationRatio > toleranceRatio) uncertainty = 'high';

  return {
    bitrateKbps,
    passStrategy,
    estimatedBytes,
    uncertainty,
    warnings: Object.freeze([...new Set(warnings)]),
  };
}

/**
 * Whether a measured size is within tolerance of the target.
 * @param {number} measuredBytes
 * @param {number} targetBytes
 * @param {number} [toleranceRatio]
 * @returns {boolean}
 */
export function isWithinTargetTolerance(measuredBytes, targetBytes, toleranceRatio = 0.12) {
  const measured = Number(measuredBytes);
  const target = Number(targetBytes);
  const tol = clamp(Number(toleranceRatio), 0.05, 0.35);
  if (!Number.isFinite(measured) || !Number.isFinite(target) || target <= 0) return false;
  return measured <= target * (1 + tol) || Math.abs(measured - target) / target <= tol;
}

/**
 * Suggest a second-pass bitrate when first pass missed the band.
 * @param {object} params
 * @param {number} params.firstPassBytes
 * @param {number} params.targetBytes
 * @param {number} params.firstPassBitrateKbps
 * @returns {number | null}
 */
export function suggestSecondPassBitrate(params) {
  if (!CONVERTER_FEATURE_FLAGS.ENABLE_V2_TWO_PASS) return null;
  const first = Number(params.firstPassBytes);
  const target = Number(params.targetBytes);
  const bitrate = Number(params.firstPassBitrateKbps);
  if (!Number.isFinite(first) || !Number.isFinite(target) || !Number.isFinite(bitrate) || first <= 0 || target <= 0) {
    return null;
  }
  const scale = target / first;
  return Math.round(clamp(bitrate * scale * 0.95, 32, 20000));
}
