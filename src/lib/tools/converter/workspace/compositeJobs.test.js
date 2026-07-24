import { describe, expect, it } from 'vitest';
import { createConversionPlan } from '@/lib/tools/converter/conversion-plan.js';
import { createJob } from '@/lib/tools/converter/converter-job-model.js';
import { converterReducer, createInitialConverterState } from '@/lib/tools/converter/converter-reducer.js';
import {
  applyTargetSizePlan,
  buildAttemptPlanSnapshot,
  collectJobsForCancel,
  isMergeParentJob,
  targetSizeCompletionWarnings,
  validateMergeExecution,
} from '@/lib/tools/converter/workspace/compositeJobs.js';

describe('compositeJobs', () => {
  it('builds full attempt plan snapshots with V2 fields', () => {
    const job = createJob({
      source: { name: 'clip.mp4', size: 1_000_000 },
      operationId: 'mp4-to-webm',
      goalId: 'under-size',
      relativePath: 'folder/clip.mp4',
      options: { targetBytes: 500_000 },
      plan: {
        goalId: 'under-size',
        operationId: 'mp4-to-webm',
        options: { targetBytes: 500_000 },
        targetBytes: 500_000,
        checksumPolicy: 'sha256',
      },
    });
    const plan = buildAttemptPlanSnapshot(job, 'ffmpeg', { LOSSY: true });
    expect(plan.targetBytes).toBe(500_000);
    expect(plan.relativePath).toBe('folder/clip.mp4');
    expect(plan.checksumPolicy).toBe('sha256');
    expect(plan.acknowledged.LOSSY).toBe(true);
  });

  it('detects merge parent jobs', () => {
    const job = createJob({
      source: { name: 'merge', size: 1 },
      goalId: 'merge',
      mergeGroupId: 'mg-1',
      childJobIds: ['a', 'b'],
    });
    expect(isMergeParentJob(job)).toBe(true);
  });

  it('collects parent and child ids for cancel', () => {
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
    expect(collectJobsForCancel(state[childA.id], state).sort()).toEqual(
      [childA.id, childB.id, parent.id].sort(),
    );
  });

  it('plans target-size bitrates and soft-complete warnings', () => {
    const plan = createConversionPlan({
      goalId: 'under-size',
      operationId: 'wav-to-mp3',
      targetBytes: 500_000,
      options: {},
    });
    const job = {
      ...createJob({
        source: { name: 'song.wav', size: 2_000_000 },
        plan,
      }),
      analysis: { category: 'audio', durationSec: 120 },
    };
    const sized = applyTargetSizePlan({
      plan: job.plan,
      job,
      options: {},
    });
    expect(sized.options.bitrateKbps).toBeGreaterThan(0);
    expect(sized.warnings).toContain('TARGET_SIZE_APPROX');
    const warnings = targetSizeCompletionWarnings({
      measuredBytes: 900_000,
      plan: job.plan,
    });
    expect(warnings).toContain('TARGET_SIZE_FAILED');
  });

  it('validates merge compatibility for child sources', () => {
    const childA = createJob({
      source: { name: 'a.wav', size: 1, detectedFormat: 'wav' },
      analysis: { category: 'audio', format: 'wav', sampleRate: 44100, channels: 2 },
    });
    const childB = createJob({
      source: { name: 'b.wav', size: 1, detectedFormat: 'wav' },
      analysis: { category: 'audio', format: 'wav', sampleRate: 44100, channels: 2 },
    });
    const parent = createJob({
      source: { name: 'merge', size: 2 },
      goalId: 'merge',
      mergeGroupId: 'mg-1',
      childJobIds: [childA.id, childB.id],
      analysis: { category: 'audio' },
    });
    const jobs = { [childA.id]: childA, [childB.id]: childB };
    const result = validateMergeExecution(parent, (id) => jobs[id]);
    expect(result.ok).toBe(true);
  });
});
