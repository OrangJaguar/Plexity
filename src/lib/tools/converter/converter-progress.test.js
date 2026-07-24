import { describe, expect, it } from 'vitest';
import {
  applyMonotonicProgress,
  clampProgress,
  jobProgressFraction,
  overallQueueProgress,
  PHASE_WEIGHTS,
} from '@/lib/tools/converter/converter-progress.js';
import { createJob, JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';

describe('converter-progress', () => {
  it('clamps progress values', () => {
    expect(clampProgress(-1)).toBe(0);
    expect(clampProgress(2)).toBe(1);
    expect(clampProgress(0.5)).toBe(0.5);
  });

  it('applies monotonic progress', () => {
    expect(applyMonotonicProgress(0.4, 0.2)).toBe(0.4);
    expect(applyMonotonicProgress(0.2, 0.6)).toBe(0.6);
  });

  it('weights analyzing, queued, and processing phases', () => {
    const job = createJob({ source: { name: 'a.png', size: 1 } });
    const analyzing = {
      ...job,
      status: JOB_STATUS.ANALYZING,
      progress: { phase: 'analyzing', fraction: 1 },
    };
    expect(jobProgressFraction(analyzing)).toBeCloseTo(PHASE_WEIGHTS.analyzing);

    const queued = {
      ...job,
      status: JOB_STATUS.QUEUED,
      progress: { phase: 'queued', fraction: 1 },
    };
    expect(jobProgressFraction(queued)).toBeCloseTo(PHASE_WEIGHTS.analyzing + PHASE_WEIGHTS.queued);

    const processing = {
      ...job,
      status: JOB_STATUS.PROCESSING,
      progress: { phase: 'processing', fraction: 0.5 },
    };
    expect(jobProgressFraction(processing)).toBeCloseTo(
      PHASE_WEIGHTS.analyzing + PHASE_WEIGHTS.queued + 0.5 * PHASE_WEIGHTS.processing,
    );
  });

  it('computes overall queue progress', () => {
    const j1 = { status: JOB_STATUS.COMPLETED, progress: { phase: null, fraction: 1 } };
    const j2 = {
      status: JOB_STATUS.PROCESSING,
      progress: { phase: 'processing', fraction: 0 },
    };
    expect(overallQueueProgress([j1, j2])).toBeCloseTo(
      (1 + PHASE_WEIGHTS.analyzing + PHASE_WEIGHTS.queued) / 2,
    );
  });
});
