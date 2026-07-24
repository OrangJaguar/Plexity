import { describe, expect, it } from 'vitest';
import {
  cancelPackageJob,
  completePackageJob,
  createPackageJob,
  DEFAULT_PACKAGE_OPTIONS,
  failPackageJob,
  isTerminalPackageStatus,
  PACKAGE_JOB_STATUS,
  startPackageJob,
  updatePackageJobProgress,
} from '@/lib/tools/converter/converter-package-model.js';

describe('converter-package-model', () => {
  it('creates an idle, frozen job', () => {
    const job = createPackageJob({ outputKeys: ['job1/a1/output', 'job2/a1/output'] });
    expect(job.status).toBe(PACKAGE_JOB_STATUS.IDLE);
    expect(job.progress).toBe(0);
    expect(job.outputKeys).toEqual(['job1/a1/output', 'job2/a1/output']);
    expect(Object.isFrozen(job)).toBe(true);
    expect(Object.isFrozen(job.outputKeys)).toBe(true);
  });

  it('transitions idle -> building -> completed without mutating prior snapshots', () => {
    const idle = createPackageJob({ outputKeys: ['a'] });
    const building = startPackageJob(idle, () => 100);
    const progressed = updatePackageJobProgress(building, 0.5, () => 150);
    const completed = completePackageJob(
      progressed,
      { fileName: 'outputs.zip', size: 128 },
      () => 200,
    );

    expect(idle.status).toBe(PACKAGE_JOB_STATUS.IDLE);
    expect(building.status).toBe(PACKAGE_JOB_STATUS.BUILDING);
    expect(building.progress).toBe(0);
    expect(progressed.progress).toBe(0.5);
    expect(completed.status).toBe(PACKAGE_JOB_STATUS.COMPLETED);
    expect(completed.progress).toBe(1);
    expect(completed.artifact).toEqual({
      fileName: 'outputs.zip',
      size: 128,
      objectUrl: null,
      artifactKey: null,
    });
    expect(completed.updatedAt).toBe(200);
    expect(isTerminalPackageStatus(completed.status)).toBe(true);
    expect(isTerminalPackageStatus(building.status)).toBe(false);
  });

  it('clamps progress into [0, 1]', () => {
    const job = updatePackageJobProgress(createPackageJob({ outputKeys: [] }), 5);
    expect(job.progress).toBe(1);
    const negative = updatePackageJobProgress(createPackageJob({ outputKeys: [] }), -5);
    expect(negative.progress).toBe(0);
  });

  it('captures failure details', () => {
    const job = failPackageJob(
      createPackageJob({ outputKeys: ['a'] }),
      { code: 'AGGREGATE_TOO_LARGE', message: 'Package exceeds limit' },
    );
    expect(job.status).toBe(PACKAGE_JOB_STATUS.FAILED);
    expect(job.error).toEqual({ code: 'AGGREGATE_TOO_LARGE', message: 'Package exceeds limit' });
    expect(isTerminalPackageStatus(job.status)).toBe(true);
  });

  it('supports cancellation with a default error descriptor', () => {
    const job = cancelPackageJob(startPackageJob(createPackageJob({ outputKeys: ['a'] })));
    expect(job.status).toBe(PACKAGE_JOB_STATUS.CANCELLED);
    expect(job.error?.code).toBe('PACKAGE_CANCELLED');
    expect(isTerminalPackageStatus(job.status)).toBe(true);
  });

  it('exposes default package build options', () => {
    expect(DEFAULT_PACKAGE_OPTIONS).toEqual({
      preserveStructure: false,
      flatten: true,
      includeChecksumSidecar: false,
      includeReport: false,
      compressionPolicy: 'auto',
    });
  });
});
