/**
 * "Where is this going?" assistant that maps a plain-language destination
 * to a concrete conversion plan, combining compatibility profiles and
 * general-purpose presets.
 */

import { getCompatibilityProfile, listCompatibilityProfiles, resolveCompatibilityPlan } from './compatibility-profiles.js';
import { createConversionPlan } from './conversion-plan.js';
import { getPresetById, listPresets, resolvePresetPlan } from './converter-presets.js';
import { listBuiltInRecipes, recipeAppliesToSource } from './converter-recipes.js';

/** @typedef {import('./source-analysis.js').SourceAnalysis} SourceAnalysis */
/** @typedef {import('./conversion-plan.js').ConversionPlan} ConversionPlan */

/** @typedef {'profile' | 'preset'} AssistantDestinationKind */

/**
 * @typedef {object} AssistantDestination
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {AssistantDestinationKind} kind
 * @property {string} refId
 */

/**
 * @typedef {object} AssistantResult
 * @property {ConversionPlan} plan
 * @property {string} explanation
 * @property {ReadonlyArray<string>} warnings
 * @property {string | null} recipeHint
 */

/** @type {ReadonlyArray<AssistantDestination>} */
const ASSISTANT_DESTINATIONS = Object.freeze([
  ...listCompatibilityProfiles().map((profile) =>
    Object.freeze({
      id: `profile:${profile.id}`,
      label: profile.label,
      description: profile.description,
      kind: 'profile',
      refId: profile.id,
    }),
  ),
  ...listPresets().map((preset) =>
    Object.freeze({
      id: `preset:${preset.id}`,
      label: preset.label,
      description: preset.description,
      kind: 'preset',
      refId: preset.id,
    }),
  ),
]);

/**
 * @returns {ReadonlyArray<AssistantDestination>}
 */
export function listAssistantDestinations() {
  return ASSISTANT_DESTINATIONS;
}

/**
 * @param {string} destinationId
 * @returns {AssistantDestination | undefined}
 */
function getDestination(destinationId) {
  return ASSISTANT_DESTINATIONS.find((d) => d.id === destinationId);
}

/**
 * Pick the best-matching built-in recipe id for a source, if any exists.
 * @param {SourceAnalysis} source
 * @returns {string | null}
 */
function findRecipeHint(source) {
  const match = listBuiltInRecipes().find((recipe) => recipeAppliesToSource(recipe, source));
  return match?.id ?? null;
}

/**
 * @param {string} destinationId
 * @param {SourceAnalysis} sourceAnalysis
 * @param {Record<string, unknown>} [options]
 * @returns {AssistantResult | null}
 */
export function mapDestinationToPlan(destinationId, sourceAnalysis, options = {}) {
  const destination = getDestination(destinationId);
  if (!destination || !sourceAnalysis) return null;

  if (destination.kind === 'profile') {
    const resolved = resolveCompatibilityPlan(destination.refId, sourceAnalysis);
    if (!resolved) return null;
    const profile = getCompatibilityProfile(destination.refId);
    return {
      plan: resolved.plan,
      explanation: `Optimized for ${profile?.label ?? destination.label}: ${profile?.description ?? destination.description}`,
      warnings: resolved.warnings,
      recipeHint: findRecipeHint(sourceAnalysis),
    };
  }

  const presetPlan = resolvePresetPlan(destination.refId, sourceAnalysis, options);
  if (!presetPlan) return null;
  const preset = getPresetById(destination.refId);
  const plan = createConversionPlan({
    goalId: presetPlan.goalId,
    operationId: presetPlan.operationId,
    options: presetPlan.options,
    warnings: presetPlan.warnings,
  });

  return {
    plan,
    explanation: `${preset?.label ?? destination.label}: ${preset?.description ?? destination.description}`,
    warnings: plan.warnings,
    recipeHint: findRecipeHint(sourceAnalysis),
  };
}
