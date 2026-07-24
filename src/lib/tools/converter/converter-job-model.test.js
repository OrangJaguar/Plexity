import { describe, expect, it } from 'vitest';
import {
  createAttemptId,
  createJob,
  createIdFactory,
  ERROR_CODES,
  isTerminalStatus,
  JOB_STATUS,
  normalizeJob,
} from '@/lib/tools/converter/converter-job-model.js';

describe('converter-job-model', () => {
  it('creates frozen jobs with attempt ids', () => {
    const idFactory = createIdFactory('test');
    const job = createJob({
      idFactory,
      now: () => 1000,
      source: { name: 'a.png', size: 42 },
      operationId: 'png-to-jpeg',
    });

    expect(job.status).toBe(JOB_STATUS.WAITING);
    expect(job.source.name).toBe('a.png');
    expect(job.attemptId).toMatch(/^test-/);
    expect(Object.isFrozen(job)).toBe(true);
    expect(Object.isFrozen(job.source)).toBe(true);
  });

  it('createAttemptId uses factory', () => {
    const idFactory = createIdFactory('attempt');
    expect(createAttemptId({ idFactory })).toMatch(/^attempt-/);
  });

  it('normalizeJob freezes nested objects', () => {
    const job = normalizeJob({
      id: 'j1',
      attemptId: 'a1',
      status: JOB_STATUS.PROCESSING,
      source: { name: 'x', size: 1 },
      progress: { phase: 'processing', fraction: 0.5 },
      createdAt: 1,
      updatedAt: 2,
    });
    expect(job.progress.fraction).toBe(0.5);
    expect(() => {
      /** @type {Record<string, unknown>} */ (job.progress).fraction = 1;
    }).toThrow();
  });

  it('tracks terminal statuses', () => {
    expect(isTerminalStatus(JOB_STATUS.COMPLETED)).toBe(true);
    expect(isTerminalStatus(JOB_STATUS.WAITING)).toBe(false);
  });

  it('defines stable error codes', () => {
    expect(ERROR_CODES.WORKER_CRASHED).toBe('WORKER_CRASHED');
    expect(ERROR_CODES.CANCELLED).toBe('CANCELLED');
    expect(ERROR_CODES.RECIPE_INVALID).toBe('RECIPE_INVALID');
    expect(ERROR_CODES.HISTORY_QUOTA).toBe('HISTORY_QUOTA');
  });

  it('normalizes v2 optional fields while keeping v1 jobs clean', () => {
    const v1 = createJob({ source: { name: 'a.png', size: 1 } });
    expect(v1.parentJobId).toBeNull();
    expect(v1.childJobIds).toEqual([]);
    expect(v1.outputs).toEqual([]);

    const v2 = createJob({
      source: { name: 'b.mp4', size: 100 },
      parentJobId: 'parent-1',
      childJobIds: ['child-1'],
      relativePath: 'clips/seg-01.mp4',
      estimate: { bytes: 900, uncertainty: 'low' },
      checksum: 'abc123',
      outputs: [{ fileName: 'out.mp4', mimeType: 'video/mp4', size: 900 }],
      recipeId: 'mobile-recipe',
      mergeGroupId: 'mg-1',
      splitSpec: { mode: 'duration', value: 60 },
      reportRef: 'report-1',
    });
    expect(v2.parentJobId).toBe('parent-1');
    expect(v2.outputs).toHaveLength(1);
    expect(v2.splitSpec?.mode).toBe('duration');
  });
});
