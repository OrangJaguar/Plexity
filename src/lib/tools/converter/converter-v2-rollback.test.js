import { describe, expect, it, vi } from 'vitest';

describe('converter v2 rollback flags', () => {
  it('disables target-size planning when ENABLE_V2_TARGET_SIZE is false', async () => {
    vi.resetModules();
    vi.doMock('@/lib/tools/converter/converter-feature-flags.js', () => ({
      CONVERTER_FEATURE_FLAGS: Object.freeze({
        ENABLE_FFMPEG: true,
        ENABLE_V2_TWO_PASS: false,
        ENABLE_V2_MERGE_SPLIT: false,
        ENABLE_V2_ADVANCED_FFMPEG: false,
        ENABLE_V2_TARGET_SIZE: false,
        ENABLE_V2_RECIPES: false,
      }),
    }));

    const { planTargetSize } = await import('@/lib/tools/converter/target-size-planner.js');
    const { validateMergeCompatibility } = await import('@/lib/tools/converter/merge-plan.js');
    const { applyRecipeToJobs } = await import('@/lib/tools/converter/workspace/recipeCoordinator.js');

    expect(planTargetSize({
      category: 'video',
      durationSec: 30,
      sourceBytes: 1_000_000,
      targetBytes: 500_000,
    })).toBeNull();

    // Merge validation still returns structural results; execution paths check the flag.
    expect(validateMergeCompatibility([
      { category: 'audio', sampleRate: 44100, channels: 2 },
      { category: 'audio', sampleRate: 44100, channels: 2 },
    ]).ok).toBe(true);

    const summary = applyRecipeToJobs({
      recipeId: 'podcast-ready-mp3',
      jobIds: ['job-1'],
      getJob: () => null,
      dispatch: () => {},
    });
    expect(summary.applied).toBe(0);
    expect(summary.skips[0]?.reason).toMatch(/disabled/i);

    vi.doUnmock('@/lib/tools/converter/converter-feature-flags.js');
    vi.resetModules();
  });
});
