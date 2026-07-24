/**
 * Versioned, shareable conversion recipes.
 * Recipes package a plan template (and optional multi-stage pipeline) that
 * can be exported/imported as JSON and re-applied to a matching source.
 */

import { getOperationById } from './conversion-capabilities.js';
import { createConversionPlan } from './conversion-plan.js';

/** @typedef {import('./source-analysis.js').SourceAnalysis} SourceAnalysis */

export const RECIPE_SCHEMA_ID = 'converter-recipe.v1';
export const RECIPE_VERSION = 1;

/** @type {ReadonlySet<string>} */
const ALLOWED_PLAN_TEMPLATE_KEYS = Object.freeze(new Set([
  'operationId',
  'options',
  'warnings',
  'engineHint',
  'metadataPolicy',
  'passStrategy',
  'targetBytes',
  'namingTemplate',
  'checksumPolicy',
  'compatibilityProfile',
  'splitSpec',
  'mergeGroupId',
]));

/** @type {ReadonlySet<string>} */
const ALLOWED_STAGE_KEYS = Object.freeze(new Set(['id', 'operationId', 'options']));

/**
 * @typedef {object} RecipeAppliesTo
 * @property {ReadonlyArray<string>} category
 * @property {ReadonlyArray<string>} format
 */

/**
 * @typedef {object} RecipeStage
 * @property {string} id
 * @property {string} operationId
 * @property {Readonly<Record<string, unknown>>} options
 */

/**
 * @typedef {object} ConverterRecipe
 * @property {string} schema
 * @property {string} id
 * @property {number} version
 * @property {string} label
 * @property {string} description
 * @property {Readonly<RecipeAppliesTo>} appliesTo
 * @property {Readonly<Record<string, unknown>>} planTemplate
 * @property {ReadonlyArray<Readonly<RecipeStage>>} stages
 */

/**
 * @param {unknown} value
 * @returns {ReadonlyArray<string>}
 */
function toStringArray(value) {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze([...new Set(value.map((v) => String(v).toLowerCase()))]);
}

/**
 * Strip any key not present in an allowlist, so imported/authored recipes
 * cannot smuggle arbitrary or unsafe fields into a plan template or stage.
 * @param {Record<string, unknown> | null | undefined} obj
 * @param {ReadonlySet<string>} allowedKeys
 * @returns {Readonly<Record<string, unknown>>}
 */
function pickAllowed(obj, allowedKeys) {
  const out = {};
  if (!obj || typeof obj !== 'object') return Object.freeze(out);
  for (const [key, value] of Object.entries(obj)) {
    if (allowedKeys.has(key)) out[key] = value;
  }
  return Object.freeze(out);
}

/**
 * @param {unknown} stages
 * @returns {ReadonlyArray<Readonly<RecipeStage>>}
 */
function normalizeStages(stages) {
  if (!Array.isArray(stages)) return Object.freeze([]);
  return Object.freeze(
    stages
      .filter((stage) => stage && typeof stage === 'object' && stage.operationId)
      .map((stage) => {
        const picked = pickAllowed(stage, ALLOWED_STAGE_KEYS);
        return Object.freeze({
          id: String(picked.id ?? stage.operationId),
          operationId: String(stage.operationId),
          options: Object.freeze({ ...picked.options }),
        });
      }),
  );
}

/**
 * @param {object} recipe
 * @returns {{ ok: boolean, errors: ReadonlyArray<string> }}
 */
export function validateRecipe(recipe) {
  const errors = [];
  if (!recipe || typeof recipe !== 'object') {
    return { ok: false, errors: ['Recipe must be an object'] };
  }
  if (recipe.schema != null && recipe.schema !== RECIPE_SCHEMA_ID) {
    errors.push(`Unknown recipe schema: ${recipe.schema}`);
  }
  if (recipe.version != null && Number(recipe.version) !== RECIPE_VERSION) {
    errors.push(`Unsupported recipe version: ${recipe.version}`);
  }
  if (!recipe.id || typeof recipe.id !== 'string') {
    errors.push('Recipe requires a string id');
  }
  const planTemplate = recipe.planTemplate;
  if (!planTemplate || typeof planTemplate !== 'object' || !planTemplate.operationId) {
    errors.push('Recipe requires planTemplate.operationId');
  }
  return { ok: errors.length === 0, errors: Object.freeze(errors) };
}

/**
 * @param {object | null | undefined} raw
 * @returns {Readonly<ConverterRecipe> | null}
 */
export function normalizeRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.schema != null && raw.schema !== RECIPE_SCHEMA_ID) return null;
  if (raw.version != null && Number(raw.version) !== RECIPE_VERSION) return null;
  if (!raw.id) return null;

  const planTemplate = pickAllowed(raw.planTemplate, ALLOWED_PLAN_TEMPLATE_KEYS);
  if (!planTemplate.operationId) return null;

  return Object.freeze({
    schema: RECIPE_SCHEMA_ID,
    id: String(raw.id),
    version: RECIPE_VERSION,
    label: String(raw.label ?? raw.id),
    description: String(raw.description ?? ''),
    appliesTo: Object.freeze({
      category: toStringArray(raw.appliesTo?.category),
      format: toStringArray(raw.appliesTo?.format),
    }),
    planTemplate,
    stages: normalizeStages(raw.stages),
  });
}

/**
 * @param {object} params
 * @param {string} params.id
 * @param {string} [params.label]
 * @param {string} [params.description]
 * @param {{ category?: ReadonlyArray<string>, format?: ReadonlyArray<string> }} [params.appliesTo]
 * @param {Record<string, unknown>} params.planTemplate
 * @param {ReadonlyArray<object>} [params.stages]
 * @returns {Readonly<ConverterRecipe> | null}
 */
export function createRecipe(params) {
  return normalizeRecipe({
    schema: RECIPE_SCHEMA_ID,
    version: RECIPE_VERSION,
    id: params.id,
    label: params.label,
    description: params.description,
    appliesTo: params.appliesTo,
    planTemplate: params.planTemplate,
    stages: params.stages,
  });
}

/**
 * @param {Readonly<ConverterRecipe>} recipe
 * @returns {string}
 */
export function exportRecipeJson(recipe) {
  return JSON.stringify({
    schema: RECIPE_SCHEMA_ID,
    id: recipe.id,
    version: recipe.version,
    label: recipe.label,
    description: recipe.description,
    appliesTo: recipe.appliesTo,
    planTemplate: recipe.planTemplate,
    stages: recipe.stages,
  });
}

/**
 * @param {string} json
 * @returns {Readonly<ConverterRecipe> | null}
 */
export function importRecipeJson(json) {
  try {
    const parsed = JSON.parse(String(json));
    return normalizeRecipe(parsed);
  } catch {
    return null;
  }
}

/**
 * @param {Readonly<ConverterRecipe>} recipe
 * @param {Pick<SourceAnalysis, 'category' | 'format'>} source
 * @returns {boolean}
 */
export function recipeAppliesToSource(recipe, source) {
  if (!recipe || !source) return false;
  const category = String(source.category ?? '').toLowerCase();
  const format = String(source.format ?? '').toLowerCase();

  const categoryOk = recipe.appliesTo.category.length === 0 || recipe.appliesTo.category.includes(category);
  const formatOk = recipe.appliesTo.format.length === 0 || recipe.appliesTo.format.includes(format);
  if (!categoryOk || !formatOk) return false;

  return Boolean(getOperationById(recipe.planTemplate.operationId));
}

/**
 * @param {Readonly<ConverterRecipe>} recipe
 * @param {SourceAnalysis} source
 * @param {Record<string, unknown>} [options]
 * @returns {{ plan: import('./conversion-plan.js').ConversionPlan, warnings: ReadonlyArray<string> } | null}
 */
export function applyRecipeToSource(recipe, source, options = {}) {
  if (!recipeAppliesToSource(recipe, source)) return null;
  const operation = getOperationById(recipe.planTemplate.operationId);
  if (!operation) return null;

  const warnings = [...(recipe.planTemplate.warnings ?? []), ...operation.warnings];
  const plan = createConversionPlan({
    goalId: `recipe:${recipe.id}`,
    operationId: operation.id,
    options: { ...recipe.planTemplate.options, ...options },
    engineHint: recipe.planTemplate.engineHint ?? null,
    warnings,
    recipeId: recipe.id,
    metadataPolicy: recipe.planTemplate.metadataPolicy,
    passStrategy: recipe.planTemplate.passStrategy,
    targetBytes: recipe.planTemplate.targetBytes,
    namingTemplate: recipe.planTemplate.namingTemplate,
    checksumPolicy: recipe.planTemplate.checksumPolicy,
    compatibilityProfile: recipe.planTemplate.compatibilityProfile,
    splitSpec: recipe.planTemplate.splitSpec,
    mergeGroupId: recipe.planTemplate.mergeGroupId,
  });

  return { plan, warnings: Object.freeze([...new Set(warnings)]) };
}

/**
 * @returns {ReadonlyArray<Readonly<ConverterRecipe>>}
 */
export function listBuiltInRecipes() {
  return BUILT_IN_RECIPES;
}

/**
 * @param {string} recipeId
 * @returns {Readonly<ConverterRecipe> | undefined}
 */
export function getRecipeById(recipeId) {
  return BUILT_IN_RECIPES.find((recipe) => recipe.id === recipeId);
}

/** @type {ReadonlyArray<Readonly<ConverterRecipe>>} */
const BUILT_IN_RECIPES = Object.freeze(
  [
    {
      id: 'podcast-ready-mp3',
      label: 'Podcast-ready MP3',
      description: 'Mono 128kbps MP3 suitable for podcast distribution.',
      appliesTo: { category: ['audio'] },
      planTemplate: {
        operationId: 'wav-to-mp3',
        options: { bitrateKbps: 128, channels: 1 },
        metadataPolicy: 'strip',
      },
    },
    {
      id: 'social-share-image',
      label: 'Social share image',
      description: 'Web-friendly WebP for social sharing.',
      appliesTo: { category: ['image'] },
      planTemplate: {
        operationId: 'png-to-webp',
        options: { quality: 0.82, maxWidth: 1920, maxHeight: 1920 },
        metadataPolicy: 'strip',
      },
    },
  ]
    .map((recipe) => normalizeRecipe(recipe))
    .filter(Boolean),
);
