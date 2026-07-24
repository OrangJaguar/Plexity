import { describe, expect, it } from 'vitest';
import { createConversionPlan, normalizeConversionPlan } from '@/lib/tools/converter/conversion-plan.js';

describe('conversion-plan', () => {
  it('creates immutable conversion plans', () => {
    const plan = createConversionPlan({
      goalId: 'make-smaller',
      operationId: 'png-to-webp',
      options: { quality: 0.8 },
      warnings: ['LOSSY'],
      acknowledged: { LOSSY: true },
    });

    expect(plan.goalId).toBe('make-smaller');
    expect(plan.operationId).toBe('png-to-webp');
    expect(plan.options.quality).toBe(0.8);
    expect(plan.warnings).toEqual(['LOSSY']);
    expect(plan.acknowledged.LOSSY).toBe(true);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it('normalizes partial plans', () => {
    const plan = normalizeConversionPlan({ operationId: 'csv-to-json' });
    expect(plan?.operationId).toBe('csv-to-json');
    expect(plan?.goalId).toBe('');
    expect(plan?.warnings).toEqual([]);
  });

  it('normalizes v2 plan fields', () => {
    const plan = createConversionPlan({
      goalId: 'compatibility',
      operationId: 'png-to-webp',
      recipeId: 'web-recipe',
      compatibilityProfile: 'browser',
      targetBytes: 500_000,
      passStrategy: 'two',
      metadataPolicy: 'strip-gps',
      namingTemplate: '{name}.{ext}',
      relativePath: 'exports/out.webp',
      mergeGroupId: 'mg-1',
      splitSpec: { mode: 'duration', value: 30 },
      estimate: { bytes: 480_000, uncertainty: 'medium' },
      checksumPolicy: 'sha256',
    });
    expect(plan.schemaVersion).toBe(2);
    expect(plan.recipeId).toBe('web-recipe');
    expect(plan.passStrategy).toBe('two');
    expect(plan.splitSpec?.mode).toBe('duration');
    expect(plan.checksumPolicy).toBe('sha256');
  });
});
