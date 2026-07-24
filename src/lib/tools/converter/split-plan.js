/**
 * Plans splitting a single source into multiple output segments by
 * duration, target size, or a fixed segment count.
 */

/** @typedef {'duration' | 'size' | 'count'} SplitMode */

/** @typedef {import('./conversion-plan.js').SplitSpec} SplitSpec */

export const SPLIT_LIMITS = Object.freeze({
  maxSegments: 20,
  minValue: 0.001,
});

const SPLIT_MODES = Object.freeze(['duration', 'size', 'count']);

/**
 * @param {object} params
 * @param {SplitMode} params.mode
 * @param {number} params.value
 * @returns {Readonly<SplitSpec> | null}
 */
export function createSplitSpec(params) {
  const mode = params?.mode;
  const value = Number(params?.value);
  if (!SPLIT_MODES.includes(mode)) return null;
  if (!Number.isFinite(value) || value <= 0) return null;
  return Object.freeze({ mode, value });
}

/**
 * @typedef {object} SplitContext
 * @property {number | null} [durationSec]
 * @property {number | null} [sourceBytes]
 */

/**
 * @param {Readonly<SplitSpec> | null | undefined} spec
 * @param {SplitContext} [context]
 * @returns {number | null}
 */
export function estimateSplitCount(spec, context = {}) {
  if (!spec || !SPLIT_MODES.includes(spec.mode) || !Number.isFinite(spec.value) || spec.value <= 0) return null;
  const { durationSec = null, sourceBytes = null } = context;

  if (spec.mode === 'count') {
    return Math.max(1, Math.round(spec.value));
  }
  if (spec.mode === 'duration') {
    if (!Number.isFinite(durationSec) || durationSec <= 0) return null;
    return Math.max(1, Math.ceil(durationSec / spec.value));
  }
  if (spec.mode === 'size') {
    if (!Number.isFinite(sourceBytes) || sourceBytes <= 0) return null;
    return Math.max(1, Math.ceil(sourceBytes / spec.value));
  }
  return null;
}

/**
 * @typedef {object} SplitValidationResult
 * @property {boolean} ok
 * @property {string} [code]
 * @property {string} [message]
 */

/**
 * @param {Readonly<SplitSpec> | null | undefined} spec
 * @param {SplitContext} [context]
 * @returns {SplitValidationResult}
 */
export function validateSplitSpec(spec, context = {}) {
  if (!spec || !SPLIT_MODES.includes(spec.mode)) {
    return { ok: false, code: 'SPLIT_SPEC_INVALID', message: 'Split spec requires a valid mode.' };
  }
  if (!Number.isFinite(spec.value) || spec.value <= 0) {
    return { ok: false, code: 'SPLIT_SPEC_INVALID', message: 'Split value must be a positive number.' };
  }

  const count = estimateSplitCount(spec, context);
  if (count != null && count > SPLIT_LIMITS.maxSegments) {
    return {
      ok: false,
      code: 'SPLIT_LIMIT_EXCEEDED',
      message: `Split would create ${count} segments, exceeding the limit of ${SPLIT_LIMITS.maxSegments}.`,
    };
  }

  return { ok: true };
}
