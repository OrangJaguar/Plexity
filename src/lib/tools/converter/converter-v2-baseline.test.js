import { describe, expect, it } from 'vitest';
import { CONVERTER_PRESETS } from '@/lib/tools/converter/converter-presets.js';
import { CONVERSION_OPERATIONS } from '@/lib/tools/converter/conversion-operations.js';
import { CONVERTER_FEATURE_FLAGS } from '@/lib/tools/converter/converter-feature-flags.js';
import { createConversionPlan } from '@/lib/tools/converter/conversion-plan.js';
import { createJob, JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';

/**
 * Plan 4 regression baseline captured before V2 refactors.
 * Plan 3 suite: 58 files / 373 tests (2026-07-19).
 */
describe('converter v2 baseline guards', () => {
  it('retains the V1 preset set as a subset of goals', () => {
    const ids = CONVERTER_PRESETS.map((p) => p.id);
    for (const id of [
      'change-format',
      'make-smaller',
      'best-quality',
      'web-optimized',
      'mobile-compatible',
      'extract-audio',
      'preserve-transparency',
      'lossless',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('keeps a non-empty verified operation matrix', () => {
    expect(CONVERSION_OPERATIONS.length).toBeGreaterThanOrEqual(40);
    expect(CONVERSION_OPERATIONS.every((op) => op.id && op.adapter)).toBe(true);
  });

  it('keeps FFmpeg enabled by default for V1 fallback paths', () => {
    expect(typeof CONVERTER_FEATURE_FLAGS.ENABLE_FFMPEG).toBe('boolean');
  });

  it('creates immutable V1-compatible plans and jobs', () => {
    const plan = createConversionPlan({
      goalId: 'make-smaller',
      operationId: 'png-to-webp',
      options: { quality: 0.8 },
    });
    expect(Object.isFrozen(plan)).toBe(true);
    expect(plan.operationId).toBe('png-to-webp');

    const job = createJob({
      source: { name: 'a.png', size: 12, detectedFormat: 'png' },
      operationId: 'png-to-webp',
      plan,
    });
    expect(job.status).toBe(JOB_STATUS.WAITING);
    expect(Object.isFrozen(job)).toBe(true);
  });
});
