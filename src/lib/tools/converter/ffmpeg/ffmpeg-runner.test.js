import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchFileMock = vi.fn(async () => new Uint8Array([1, 2, 3]));
const getFfmpegRuntimeMock = vi.fn();
const disposeFfmpegRuntimeMock = vi.fn(async () => {});
const recreateFfmpegRuntimeMock = vi.fn(async () => {});
const buildFfmpegArgvMock = vi.fn(() => ['-i', 'input.wav', 'output.mp3']);

vi.mock('@ffmpeg/util', () => ({
  fetchFile: (...args) => fetchFileMock(...args),
}));

vi.mock('@/lib/tools/converter/ffmpeg/ffmpeg-operations.js', () => ({
  buildFfmpegArgv: (...args) => buildFfmpegArgvMock(...args),
  sanitizeVirtualName: (ext) => `input.${ext}`,
  sanitizeVirtualOutput: (ext) => `output.${ext}`,
}));

vi.mock('@/lib/tools/converter/ffmpeg/ffmpeg-runtime.js', () => ({
  disposeFfmpegRuntime: (...args) => disposeFfmpegRuntimeMock(...args),
  getFfmpegRuntime: (...args) => getFfmpegRuntimeMock(...args),
  recreateFfmpegRuntime: (...args) => recreateFfmpegRuntimeMock(...args),
}));

const {
  cancelFfmpegJob,
  disposeFfmpegRunner,
  normalizeFfmpegError,
  runFfmpegJob,
} = await import('@/lib/tools/converter/ffmpeg/ffmpeg-runner.js');

/**
 * @param {object} [overrides]
 */
function createMockFfmpeg(overrides = {}) {
  return {
    writeFile: vi.fn(async () => {}),
    exec: vi.fn(async () => {}),
    readFile: vi.fn(async () => new Uint8Array([9, 9, 9])),
    deleteFile: vi.fn(async () => {}),
    ...overrides,
  };
}

function baseJob(overrides = {}) {
  return {
    builderName: 'convertAudioToMp3',
    builderParams: {},
    sourceBytes: new Uint8Array([1, 2, 3]),
    inputExt: 'wav',
    outputExt: 'mp3',
    mimeType: 'audio/mpeg',
    ...overrides,
  };
}

describe('ffmpeg-runner', () => {
  beforeEach(() => {
    fetchFileMock.mockClear();
    getFfmpegRuntimeMock.mockReset();
    disposeFfmpegRuntimeMock.mockClear();
    recreateFfmpegRuntimeMock.mockClear();
    buildFfmpegArgvMock.mockClear();
  });

  afterEach(async () => {
    await disposeFfmpegRunner();
  });

  it('runs a job end to end and returns a blob result', async () => {
    const mockFfmpeg = createMockFfmpeg();
    getFfmpegRuntimeMock.mockResolvedValue(mockFfmpeg);

    const result = await runFfmpegJob(baseJob());

    expect(mockFfmpeg.writeFile).toHaveBeenCalledWith('input.wav', expect.any(Uint8Array));
    expect(mockFfmpeg.exec).toHaveBeenCalledWith(['-i', 'input.wav', 'output.mp3']);
    expect(mockFfmpeg.deleteFile).toHaveBeenCalledWith('input.wav');
    expect(mockFfmpeg.deleteFile).toHaveBeenCalledWith('output.mp3');
    expect(result.mimeType).toBe('audio/mpeg');
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.metadata).toEqual({ engine: 'ffmpeg' });
  });

  it('serializes jobs — a second job does not start until the first resolves', async () => {
    const order = [];
    let releaseFirst;
    const firstExec = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    let execCount = 0;
    const mockFfmpeg = createMockFfmpeg({
      exec: vi.fn(async () => {
        execCount += 1;
        const label = `job${execCount}`;
        order.push(`${label}-exec-start`);
        if (execCount === 1) await firstExec;
        order.push(`${label}-exec-end`);
      }),
    });
    getFfmpegRuntimeMock.mockResolvedValue(mockFfmpeg);

    const job1 = runFfmpegJob(baseJob({ fileName: 'job1' }));
    const job2 = runFfmpegJob(baseJob({ fileName: 'job2' }));

    await new Promise((r) => setTimeout(r, 10));
    expect(order).toEqual(['job1-exec-start']);

    releaseFirst();
    await job1;
    await new Promise((r) => setTimeout(r, 5));
    await job2;

    expect(order).toEqual(['job1-exec-start', 'job1-exec-end', 'job2-exec-start', 'job2-exec-end']);
  });

  it('isolates a failure in one job from the next queued job', async () => {
    const mockFfmpeg = createMockFfmpeg({
      exec: vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined),
    });
    getFfmpegRuntimeMock.mockResolvedValue(mockFfmpeg);

    const job1 = runFfmpegJob(baseJob());
    const job2 = runFfmpegJob(baseJob());

    await expect(job1).rejects.toMatchObject({ code: 'PROCESSING_FAILED' });
    await expect(job2).resolves.toMatchObject({ mimeType: 'audio/mpeg' });
  });

  it('rejects immediately when the job signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(runFfmpegJob(baseJob({ signal: controller.signal }))).rejects.toMatchObject({
      code: 'CANCELLED',
    });
    expect(getFfmpegRuntimeMock).not.toHaveBeenCalled();
  });

  it('cancelFfmpegJob rejects the active job and recreates the runtime', async () => {
    let releaseExec;
    const execPromise = new Promise((_resolve, reject) => {
      releaseExec = reject;
    });
    const mockFfmpeg = createMockFfmpeg({ exec: vi.fn(() => execPromise) });
    getFfmpegRuntimeMock.mockResolvedValue(mockFfmpeg);

    const controller = new AbortController();
    const job = runFfmpegJob(baseJob({ signal: controller.signal }));

    await new Promise((r) => setTimeout(r, 10));
    const cancelPromise = cancelFfmpegJob();
    // Simulate the underlying wasm instance erroring out once the runtime is
    // recreated mid-exec (recreateFfmpegRuntime terminates the active instance).
    releaseExec(new Error('terminated'));

    await cancelPromise;
    await expect(job).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(recreateFfmpegRuntimeMock).toHaveBeenCalled();
  });

  it('normalizeFfmpegError defaults to PROCESSING_FAILED and preserves messages', () => {
    const err = normalizeFfmpegError(new Error('bad argv'));
    expect(err.code).toBe('PROCESSING_FAILED');
    expect(err.message).toBe('bad argv');

    const withCode = normalizeFfmpegError('plain string', 'CANCELLED');
    expect(withCode.code).toBe('CANCELLED');
    expect(withCode.message).toBe('plain string');
  });

  it('disposeFfmpegRunner disposes the runtime and resets the chain', async () => {
    await disposeFfmpegRunner();
    expect(disposeFfmpegRuntimeMock).toHaveBeenCalled();
  });
});
