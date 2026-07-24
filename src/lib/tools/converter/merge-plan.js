/**
 * Plans a "merge" job that concatenates multiple same-category sources
 * into a single output. Actual encoding happens downstream — this module
 * only validates compatibility and produces the plan/grouping metadata.
 */

import { createConversionPlan } from './conversion-plan.js';
import { createIdFactory } from './converter-job-model.js';

/** @typedef {'audio' | 'video'} MergeCategory */

export const MERGE_LIMITS = Object.freeze({
  maxInputs: 12,
  minInputs: 2,
});

/** @type {ReadonlyArray<MergeCategory>} */
export const MERGE_SUPPORTED_CATEGORIES = Object.freeze(['audio', 'video']);

const createMergeGroupId = createIdFactory('merge');

/**
 * @typedef {object} MergeCompatibilityResult
 * @property {boolean} ok
 * @property {string} [code]
 * @property {string} [message]
 */

/**
 * @param {ReadonlyArray<{ category?: string, format?: string, sampleRate?: number | null, channels?: number | null }>} sources
 * @returns {MergeCompatibilityResult}
 */
export function validateMergeCompatibility(sources) {
  if (!Array.isArray(sources) || sources.length < MERGE_LIMITS.minInputs) {
    return { ok: false, code: 'TOO_FEW_SOURCES', message: 'Merging requires at least two sources.' };
  }
  if (sources.length > MERGE_LIMITS.maxInputs) {
    return {
      ok: false,
      code: 'TOO_MANY_SOURCES',
      message: `Merging supports at most ${MERGE_LIMITS.maxInputs} sources.`,
    };
  }

  const categories = new Set(sources.map((s) => String(s?.category ?? '').toLowerCase()));
  if (categories.size > 1) {
    return { ok: false, code: 'CATEGORY_MISMATCH', message: 'All sources must share the same category to merge.' };
  }

  const [category] = categories;
  if (!MERGE_SUPPORTED_CATEGORIES.includes(/** @type {MergeCategory} */ (category))) {
    return {
      ok: false,
      code: 'UNSUPPORTED_CATEGORY',
      message: `Merging is not supported for category "${category || 'unknown'}".`,
    };
  }

  if (category === 'audio') {
    const rates = new Set(sources.map((s) => Number(s.sampleRate ?? 0)));
    const channels = new Set(sources.map((s) => Number(s.channels ?? 0)));
    if (rates.size > 1 || channels.size > 1) {
      return {
        ok: false,
        code: 'AUDIO_MISMATCH',
        message: 'Audio merge requires matching sample rate and channel count.',
      };
    }
  }

  return { ok: true };
}

/**
 * @typedef {object} MergePlanResult
 * @property {string} mergeGroupId
 * @property {ReadonlyArray<string>} sourceJobIds
 * @property {import('./conversion-plan.js').ConversionPlan} plan
 */

/**
 * @param {object} params
 * @param {ReadonlyArray<string>} params.sourceJobIds
 * @param {MergeCategory} params.category
 * @param {string} params.outputFormat
 * @returns {MergePlanResult | null}
 */
export function createMergePlan(params) {
  const { sourceJobIds, category, outputFormat } = params ?? {};
  if (!Array.isArray(sourceJobIds) || sourceJobIds.length < MERGE_LIMITS.minInputs) return null;
  if (!MERGE_SUPPORTED_CATEGORIES.includes(category)) return null;
  if (!outputFormat) return null;

  const mergeGroupId = createMergeGroupId();
  const plan = createConversionPlan({
    goalId: `merge:${category}`,
    operationId: `merge-${category}`,
    options: { outputFormat: String(outputFormat) },
    warnings: ['MERGE_LOSSY'],
    mergeGroupId,
  });

  return {
    mergeGroupId,
    sourceJobIds: Object.freeze(sourceJobIds.map(String)),
    plan,
  };
}
