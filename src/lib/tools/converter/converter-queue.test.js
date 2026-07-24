import { describe, expect, it, vi } from 'vitest';
import { createConverterQueue } from '@/lib/tools/converter/converter-queue.js';

describe('converter-queue', () => {
  it('runs jobs FIFO with concurrency limit', async () => {
    const order = [];
    const queue = createConverterQueue({
      concurrency: 1,
      onJobStart: async (jobId) => ({
        cancel: () => {},
        dispose: () => {},
      }),
      onJobComplete: (jobId) => order.push(`done:${jobId}`),
    });

    queue.enqueue('j1', 'a1');
    queue.enqueue('j2', 'a1');

    await new Promise((r) => setTimeout(r, 10));
    queue.complete('j1', 'a1');
    await new Promise((r) => setTimeout(r, 10));
    queue.complete('j2', 'a1');

    expect(order).toEqual(['done:j1', 'done:j2']);
  });

  it('cancels queued jobs before start', async () => {
    const started = vi.fn();
    const queue = createConverterQueue({
      concurrency: 1,
      onJobStart: async () => {
        started();
        return { cancel: () => {}, dispose: () => {} };
      },
    });

    queue.enqueue('j1', 'a1');
    queue.enqueue('j2', 'a1');
    queue.cancel('j2', 'a1');

    await new Promise((r) => setTimeout(r, 5));
    expect(started).toHaveBeenCalledTimes(1);
  });

  it('calls cancel on active job handle', async () => {
    const cancel = vi.fn();
    const queue = createConverterQueue({
      concurrency: 1,
      onJobStart: async () => ({ cancel, dispose: () => {} }),
    });

    queue.enqueue('j1', 'a1');
    await new Promise((r) => setTimeout(r, 5));
    queue.cancel('j1', 'a1');
    expect(cancel).toHaveBeenCalled();
  });

  it('complete releases worker handle but not dispose', async () => {
    const dispose = vi.fn();
    const releaseWorker = vi.fn();
    const queue = createConverterQueue({
      concurrency: 1,
      onJobStart: async () => ({ cancel: () => {}, dispose, releaseWorker }),
    });

    queue.enqueue('j1', 'a1');
    await new Promise((r) => setTimeout(r, 5));
    queue.complete('j1', 'a1');

    expect(releaseWorker).toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
  });

  it('isolates job failures', async () => {
    const errors = [];
    const queue = createConverterQueue({
      concurrency: 2,
      onJobStart: async () => ({ cancel: () => {}, dispose: () => {} }),
      onJobError: (_j, _a, err) => errors.push(err),
    });

    queue.enqueue('j1', 'a1');
    queue.enqueue('j2', 'a1');
    await new Promise((r) => setTimeout(r, 5));
    queue.fail('j1', 'a1', new Error('boom'));
    queue.complete('j2', 'a1');
    expect(errors).toHaveLength(1);
  });

  it('runs named lanes with independent concurrency', async () => {
    const started = [];
    const queue = createConverterQueue({
      lanes: { native: 2, ffmpeg: 1 },
      onJobStart: async (jobId, _attemptId, lane) => {
        started.push({ jobId, lane });
        return { cancel: () => {}, dispose: () => {} };
      },
    });

    queue.enqueue('n1', 'a1', 'native');
    queue.enqueue('n2', 'a1', 'native');
    queue.enqueue('f1', 'a1', 'ffmpeg');
    queue.enqueue('f2', 'a1', 'ffmpeg');

    await new Promise((r) => setTimeout(r, 10));

    expect(started.map((s) => s.jobId).sort()).toEqual(['f1', 'n1', 'n2']);
    expect(queue.getActiveCount('native')).toBe(2);
    expect(queue.getActiveCount('ffmpeg')).toBe(1);
    expect(queue.getPendingCount('ffmpeg')).toBe(1);
  });

  it('keeps FIFO within a lane and isolates failures across lanes', async () => {
    const order = [];
    const errors = [];
    const queue = createConverterQueue({
      lanes: { native: 1, ffmpeg: 1 },
      onJobStart: async () => ({ cancel: () => {}, dispose: () => {} }),
      onJobComplete: (jobId) => order.push(jobId),
      onJobError: (jobId, _attemptId, error) => errors.push({ jobId, error }),
    });

    queue.enqueue('n1', 'a1', 'native');
    queue.enqueue('n2', 'a1', 'native');
    queue.enqueue('f1', 'a1', 'ffmpeg');

    await new Promise((r) => setTimeout(r, 10));
    queue.fail('n1', 'a1', new Error('native failed'));
    queue.complete('f1', 'a1');
    await new Promise((r) => setTimeout(r, 10));
    queue.complete('n2', 'a1');

    expect(errors).toHaveLength(1);
    expect(errors[0].jobId).toBe('n1');
    expect(order).toEqual(['f1', 'n2']);
  });

  it('stays backward compatible without a lanes option', async () => {
    const queue = createConverterQueue({
      concurrency: 2,
      onJobStart: async () => ({ cancel: () => {}, dispose: () => {} }),
    });

    queue.enqueue('j1', 'a1');
    queue.enqueue('j2', 'a1');
    await new Promise((r) => setTimeout(r, 5));

    expect(queue.getActiveCount()).toBe(2);
    expect(queue.getPendingCount()).toBe(0);
  });
});
