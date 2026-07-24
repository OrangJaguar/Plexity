/**
 * Normalize LLM JSON into ConversionPlan / recipe drafts; reject unsafe fields.
 */

import { REMOTE_PLAN_OPERATION_ALLOWLIST, REMOTE_ERROR_CODES } from '../remote-job-schema.js';
import { AI_ERROR_CODES } from './ai-quotas.js';
import { normalizeRecipe, RECIPE_SCHEMA_ID } from '../converter-recipes.js';

/**
 * @param {unknown} raw
 * @returns {{ ok: true, plan: Record<string, unknown>, explanation?: string, warnings?: string[] }
 *   | { ok: false, code: string }}
 */
export function normalizeAiPlanDraft(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED };
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED };
  }

  const root = /** @type {Record<string, unknown>} */ (obj);
  const planSrc = (root.plan && typeof root.plan === 'object' && !Array.isArray(root.plan))
    ? /** @type {Record<string, unknown>} */ (root.plan)
    : root;

  if ('argv' in planSrc || 'ffmpegArgs' in planSrc || 'command' in planSrc || 'shell' in planSrc) {
    return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED };
  }

  const operationId = typeof planSrc.operationId === 'string' ? planSrc.operationId : '';
  if (!REMOTE_PLAN_OPERATION_ALLOWLIST.has(operationId)) {
    return { ok: false, code: REMOTE_ERROR_CODES.PLAN_INVALID };
  }

  const options = (planSrc.options && typeof planSrc.options === 'object' && !Array.isArray(planSrc.options))
    ? { .../** @type {Record<string, unknown>} */ (planSrc.options) }
    : {};

  // Strip nested escape hatches from options.
  delete options.argv;
  delete options.ffmpegArgs;
  delete options.command;
  delete options.shell;

  const plan = Object.freeze({
    schemaVersion: 2,
    operationId,
    options: Object.freeze(options),
    goalId: typeof planSrc.goalId === 'string' ? planSrc.goalId.slice(0, 64) : null,
  });

  const explanation = typeof root.explanation === 'string'
    ? root.explanation.slice(0, 500)
    : undefined;
  const warnings = Array.isArray(root.warnings)
    ? root.warnings.filter((w) => typeof w === 'string').map((w) => w.slice(0, 120)).slice(0, 8)
    : [];

  return { ok: true, plan, explanation, warnings };
}

/**
 * @param {unknown} raw
 * @returns {{ ok: true, recipe: Record<string, unknown> } | { ok: false, code: string }}
 */
export function normalizeAiRecipeDraft(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED };
    }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED };
  }

  const root = /** @type {Record<string, unknown>} */ (obj);
  const recipeCandidate = (root.recipe && typeof root.recipe === 'object')
    ? root.recipe
    : root;

  const withSchema = {
    schema: RECIPE_SCHEMA_ID,
    version: 1,
    id: typeof /** @type {Record<string, unknown>} */ (recipeCandidate).id === 'string'
      ? /** @type {Record<string, unknown>} */ (recipeCandidate).id
      : `ai-recipe-${Date.now().toString(36)}`,
    label: 'AI recipe draft',
    planTemplate: /** @type {Record<string, unknown>} */ (recipeCandidate).planTemplate
      || /** @type {Record<string, unknown>} */ (recipeCandidate).plan
      || recipeCandidate,
    .../** @type {Record<string, unknown>} */ (recipeCandidate),
  };

  const recipe = normalizeRecipe(withSchema);
  if (!recipe) {
    return { ok: false, code: AI_ERROR_CODES.AI_VALIDATION_FAILED };
  }

  const planCheck = normalizeAiPlanDraft({
    plan: recipe.planTemplate || {},
  });
  if (!planCheck.ok) return planCheck;

  return { ok: true, recipe };
}
