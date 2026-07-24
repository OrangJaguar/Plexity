import { describe, expect, it } from 'vitest';
import { createJob } from '@/lib/tools/converter/converter-job-model.js';
import {
  converterReducer,
  createInitialConverterState,
} from '@/lib/tools/converter/converter-reducer.js';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';

describe('converter-reducer', () => {
  const now = () => 2000;

  it('adds and progresses a job through analyze and process', () => {
    let state = createInitialConverterState();
    const job = createJob({ source: { name: 'a.png', size: 10 }, now: () => 1000 });
    state = converterReducer(state, { type: 'ADD_JOB', job }, now);

    state = converterReducer(state, {
      type: 'ANALYZE_START',
      jobId: job.id,
      attemptId: job.attemptId,
    }, now);
    expect(state[job.id].status).toBe(JOB_STATUS.ANALYZING);

    state = converterReducer(state, {
      type: 'ANALYZE_SUCCESS',
      jobId: job.id,
      attemptId: job.attemptId,
      analysis: { width: 100, height: 100 },
    }, now);

    state = converterReducer(state, {
      type: 'PROCESS_START',
      jobId: job.id,
      attemptId: job.attemptId,
    }, now);
    expect(state[job.id].status).toBe(JOB_STATUS.PROCESSING);

    state = converterReducer(state, {
      type: 'COMPLETE',
      jobId: job.id,
      attemptId: job.attemptId,
      output: { fileName: 'a.jpg', mimeType: 'image/jpeg', size: 5 },
    }, now);
    expect(state[job.id].status).toBe(JOB_STATUS.COMPLETED);
  });

  it('ignores stale attempt events', () => {
    let state = createInitialConverterState();
    const job = createJob({ source: { name: 'a.png', size: 10 } });
    state = converterReducer(state, { type: 'ADD_JOB', job });
    state = converterReducer(state, {
      type: 'ANALYZE_START',
      jobId: job.id,
      attemptId: job.attemptId,
    });
    state = converterReducer(state, {
      type: 'PROGRESS',
      jobId: job.id,
      attemptId: 'stale',
      fraction: 0.9,
    });
    expect(state[job.id].progress.fraction).toBe(0);
  });

  it('links parent and child composite jobs', () => {
    let state = createInitialConverterState();
    const parent = createJob({ source: { name: 'merge', size: 1 } });
    const childA = createJob({ source: { name: 'a.wav', size: 1 } });
    const childB = createJob({ source: { name: 'b.wav', size: 1 } });
    state = converterReducer(state, { type: 'ADD_JOB', job: parent });
    state = converterReducer(state, { type: 'ADD_JOB', job: childA });
    state = converterReducer(state, { type: 'ADD_JOB', job: childB });
    state = converterReducer(state, {
      type: 'LINK_COMPOSITE',
      parentJobId: parent.id,
      childJobIds: [childA.id, childB.id],
    });
    expect(state[parent.id].childJobIds).toEqual([childA.id, childB.id]);
    expect(state[childA.id].parentJobId).toBe(parent.id);
    expect(state[childB.id].parentJobId).toBe(parent.id);
  });

  it('stores checksum and completion warnings on complete', () => {
    let state = createInitialConverterState();
    const job = createJob({ source: { name: 'a.png', size: 10 } });
    state = converterReducer(state, { type: 'ADD_JOB', job });
    state = converterReducer(state, {
      type: 'PROCESS_START',
      jobId: job.id,
      attemptId: job.attemptId,
      plan: {
        goalId: 'manual',
        operationId: 'png-to-jpeg',
        options: {},
        warnings: ['LOSSY'],
      },
    });
    state = converterReducer(state, {
      type: 'COMPLETE',
      jobId: job.id,
      attemptId: job.attemptId,
      output: { fileName: 'a.jpg', mimeType: 'image/jpeg', size: 5 },
      checksum: 'abc123',
      completionWarnings: ['TARGET_SIZE_APPROX'],
    });
    expect(state[job.id].checksum).toBe('abc123');
    expect(state[job.id].plan?.warnings).toContain('TARGET_SIZE_APPROX');
  });

  it('retry resets job to waiting with new attempt', () => {
    let state = createInitialConverterState();
    const job = createJob({ source: { name: 'a.png', size: 10 } });
    state = converterReducer(state, { type: 'ADD_JOB', job });
    state = converterReducer(state, {
      type: 'FAIL',
      jobId: job.id,
      attemptId: job.attemptId,
      error: { code: 'PROCESSING_FAILED', message: 'nope' },
    });
    state = converterReducer(state, {
      type: 'RETRY',
      jobId: job.id,
      attemptId: 'attempt-new',
    });
    expect(state[job.id].status).toBe(JOB_STATUS.WAITING);
    expect(state[job.id].attemptId).toBe('attempt-new');
    expect(state[job.id].error).toBeNull();
  });

  it('transitions through queued before processing', () => {
    let state = createInitialConverterState();
    const job = createJob({ source: { name: 'a.png', size: 10 }, now: () => 1000 });
    state = converterReducer(state, { type: 'ADD_JOB', job }, now);

    state = converterReducer(state, {
      type: 'QUEUE',
      jobId: job.id,
      attemptId: job.attemptId,
    }, now);
    expect(state[job.id].status).toBe(JOB_STATUS.QUEUED);

    state = converterReducer(state, {
      type: 'PROCESS_START',
      jobId: job.id,
      attemptId: job.attemptId,
      engine: 'native-image',
    }, now);
    expect(state[job.id].status).toBe(JOB_STATUS.PROCESSING);
    expect(state[job.id].engine).toBe('native-image');
  });

  it('ignores illegal transitions from terminal states', () => {
    let state = createInitialConverterState();
    const job = createJob({ source: { name: 'a.png', size: 10 } });
    state = converterReducer(state, { type: 'ADD_JOB', job });
    state = converterReducer(state, {
      type: 'CANCEL',
      jobId: job.id,
    });
    state = converterReducer(state, {
      type: 'PROCESS_START',
      jobId: job.id,
      attemptId: job.attemptId,
    });
    expect(state[job.id].status).toBe(JOB_STATUS.CANCELLED);
  });
});
