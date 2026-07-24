import { describe, expect, it } from 'vitest';
import {
  RECIPE_SCHEMA_ID,
  applyRecipeToSource,
  createRecipe,
  exportRecipeJson,
  importRecipeJson,
  normalizeRecipe,
  recipeAppliesToSource,
  validateRecipe,
} from '@/lib/tools/converter/converter-recipes.js';
import { normalizeSourceAnalysis } from '@/lib/tools/converter/source-analysis.js';

describe('converter-recipes', () => {
  const source = normalizeSourceAnalysis({
    adapterAnalysis: { format: 'png', category: 'image', width: 800, height: 600 },
  });

  it('creates and normalizes v1 recipes', () => {
    const recipe = createRecipe({
      id: 'web-png',
      label: 'Web PNG',
      planTemplate: { operationId: 'png-to-webp', options: { quality: 0.82 } },
      appliesTo: { category: ['image'], format: ['png'] },
    });
    expect(recipe?.schema).toBe(RECIPE_SCHEMA_ID);
    expect(Object.isFrozen(recipe)).toBe(true);
  });

  it('validates required fields', () => {
    const result = validateRecipe({ id: '', planTemplate: {} });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown schema versions on import', () => {
    const json = JSON.stringify({
      schema: 'converter-recipe.v99',
      id: 'bad',
      planTemplate: { operationId: 'png-to-webp' },
    });
    expect(importRecipeJson(json)).toBeNull();
  });

  it('rejects unsafe fields via allowlist on normalize', () => {
    const recipe = normalizeRecipe({
      schema: RECIPE_SCHEMA_ID,
      id: 'r1',
      planTemplate: {
        operationId: 'png-to-webp',
        injected: true,
      },
    });
    expect(recipe?.planTemplate).not.toHaveProperty('injected');
  });

  it('exports and imports round-trip', () => {
    const recipe = createRecipe({
      id: 'smaller',
      label: 'Smaller',
      planTemplate: { operationId: 'png-to-webp' },
    });
    expect(recipe).not.toBeNull();
    const imported = importRecipeJson(exportRecipeJson(/** @type {NonNullable<typeof recipe>} */ (recipe)));
    expect(imported?.id).toBe('smaller');
  });

  it('applies recipes to matching sources', () => {
    const recipe = createRecipe({
      id: 'web',
      label: 'Web',
      planTemplate: { operationId: 'png-to-webp', options: { quality: 0.82 } },
      appliesTo: { category: ['image'] },
    });
    expect(recipe).not.toBeNull();
    expect(recipeAppliesToSource(/** @type {NonNullable<typeof recipe>} */ (recipe), source)).toBe(true);
    const applied = applyRecipeToSource(/** @type {NonNullable<typeof recipe>} */ (recipe), source);
    expect(applied?.plan.operationId).toBe('png-to-webp');
  });

  it('returns null for incompatible sources', () => {
    const recipe = createRecipe({
      id: 'extract',
      label: 'Extract',
      planTemplate: { operationId: 'extract-audio-mp4' },
      appliesTo: { category: ['video'] },
    });
    expect(recipe).not.toBeNull();
    expect(applyRecipeToSource(/** @type {NonNullable<typeof recipe>} */ (recipe), source)).toBeNull();
  });

  it('normalizeRecipe returns null for empty input', () => {
    expect(normalizeRecipe(null)).toBeNull();
  });
});
