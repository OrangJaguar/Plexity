/**
 * Apply shareable recipes to workspace jobs with skip summaries.
 */

import { CONVERTER_FEATURE_FLAGS } from '../converter-feature-flags.js';
import { createConversionPlan } from '../conversion-plan.js';
import { JOB_STATUS } from '../converter-job-model.js';
import {
  applyRecipeToSource,
  getRecipeById,
} from '../converter-recipes.js';
import { jobToSourceAnalysis } from './batch-selection.js';

/**
 * @typedef {object} RecipeApplySkip
 * @property {string} jobId
 * @property {string} reason
 */

/**
 * @typedef {object} RecipeApplySummary
 * @property {number} applied
 * @property {number} skipped
 * @property {ReadonlyArray<RecipeApplySkip>} skips
 */

/**
 * @param {import('../converter-job-model.js').ConverterJob | null | undefined} job
 */
export function canApplyRecipeToJob(job) {
  if (!job || job.removed) return false;
  if (job.status === JOB_STATUS.COMPLETED) return false;
  if (job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED) return false;
  return Boolean(job.analysis?.format || job.source.detectedFormat);
}

/**
 * @param {object} params
 * @param {string} params.recipeId
 * @param {ReadonlyArray<string>} params.jobIds
 * @param {(jobId: string) => import('../converter-job-model.js').ConverterJob | null | undefined} params.getJob
 * @param {(action: object) => void} params.dispatch
 * @param {Record<string, Record<string, boolean>>} [params.acknowledgments]
 * @param {(jobId: string) => void} [params.recheckAdmission]
 * @param {import('../converter-recipes.js').ConverterRecipe | null} [params.recipe]
 * @returns {RecipeApplySummary}
 */
export function applyRecipeToJobs(params) {
  /** @type {RecipeApplySkip[]} */
  const skips = [];
  let applied = 0;

  if (!CONVERTER_FEATURE_FLAGS.ENABLE_V2_RECIPES) {
    return {
      applied: 0,
      skipped: params.jobIds.length,
      skips: Object.freeze(params.jobIds.map((jobId) => ({
        jobId,
        reason: 'Recipes are disabled by feature flag',
      }))),
    };
  }

  const recipe = params.recipe ?? getRecipeById(params.recipeId);
  if (!recipe) {
    return {
      applied: 0,
      skipped: params.jobIds.length,
      skips: Object.freeze(params.jobIds.map((jobId) => ({
        jobId,
        reason: 'Recipe not found',
      }))),
    };
  }

  for (const jobId of params.jobIds) {
    const job = params.getJob(jobId);
    if (!canApplyRecipeToJob(job)) {
      skips.push({ jobId, reason: 'Job is not ready for recipe apply' });
      continue;
    }

    const source = jobToSourceAnalysis(/** @type {NonNullable<typeof job>} */ (job));
    if (!source) {
      skips.push({ jobId, reason: 'Source analysis unavailable' });
      continue;
    }

    const resolved = applyRecipeToSource(recipe, source);
    if (!resolved) {
      skips.push({ jobId, reason: 'Recipe does not apply to this source' });
      continue;
    }

    const acknowledgments = params.acknowledgments?.[jobId] ?? {};
    params.dispatch({
      type: 'SET_OPERATION',
      jobId,
      operationId: resolved.plan.operationId,
      options: resolved.plan.options,
      goalId: resolved.plan.goalId,
      recipeId: recipe.id,
      plan: createConversionPlan({
        ...resolved.plan,
        acknowledged: acknowledgments,
        recipeId: recipe.id,
      }),
    });
    params.recheckAdmission?.(jobId);
    applied += 1;
  }

  return {
    applied,
    skipped: skips.length,
    skips: Object.freeze(skips),
  };
}
