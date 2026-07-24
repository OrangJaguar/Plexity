import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadMock = vi.fn();
const terminateMock = vi.fn();
const onMock = vi.fn();
let lastFfmpegInstance = null;

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: vi.fn().mockImplementation(function FFmpegMock() {
    const instance = {
      loaded: false,
      on: (...args) => onMock(...args),
      load: (...args) => loadMock(...args).then(() => {
        instance.loaded = true;
      }),
      terminate: (...args) => terminateMock(...args),
    };
    lastFfmpegInstance = instance;
    return instance;
  }),
}));

vi.mock('@ffmpeg/util', () => ({
  toBlobURL: vi.fn(async (url, mime) => `blob:${url}#${mime}`),
}));

const { toBlobURL } = await import('@ffmpeg/util');
const {
  CORE_JS,
  CORE_WASM,
  disposeFfmpegRuntime,
  getFfmpegRuntime,
  isFfmpegLoaded,
  recreateFfmpegRuntime,
} = await import('@/lib/tools/converter/ffmpeg/ffmpeg-runtime.js');

describe('ffmpeg-runtime', () => {
  beforeEach(() => {
    loadMock.mockReset().mockResolvedValue(undefined);
    terminateMock.mockReset().mockResolvedValue(undefined);
    onMock.mockReset();
    toBlobURL.mockClear();
    lastFfmpegInstance = null;
  });

  afterEach(async () => {
    await disposeFfmpegRuntime();
  });

  it('lazily constructs core.js/core.wasm blob URLs on first load', async () => {
    expect(toBlobURL).not.toHaveBeenCalled();

    await getFfmpegRuntime();

    expect(toBlobURL).toHaveBeenCalledWith(CORE_JS, 'text/javascript');
    expect(toBlobURL).toHaveBeenCalledWith(CORE_WASM, 'application/wasm');
    expect(loadMock).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledWith({
      coreURL: `blob:${CORE_JS}#text/javascript`,
      wasmURL: `blob:${CORE_WASM}#application/wasm`,
    });
  });

  it('caches the loaded instance across calls', async () => {
    const first = await getFfmpegRuntime();
    const second = await getFfmpegRuntime();

    expect(second).toBe(first);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it('shares a single in-flight load between concurrent callers', async () => {
    const [first, second] = await Promise.all([getFfmpegRuntime(), getFfmpegRuntime()]);

    expect(second).toBe(first);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  it('reports isFfmpegLoaded based on the cached instance', async () => {
    expect(isFfmpegLoaded()).toBe(false);
    await getFfmpegRuntime();
    expect(isFfmpegLoaded()).toBe(true);
    await disposeFfmpegRuntime();
    expect(isFfmpegLoaded()).toBe(false);
  });

  it('dispose terminates the instance and clears the cache', async () => {
    await getFfmpegRuntime();
    await disposeFfmpegRuntime();

    expect(terminateMock).toHaveBeenCalledTimes(1);
    expect(isFfmpegLoaded()).toBe(false);
  });

  it('dispose swallows terminate errors', async () => {
    terminateMock.mockRejectedValueOnce(new Error('already gone'));
    await getFfmpegRuntime();

    await expect(disposeFfmpegRuntime()).resolves.toBeUndefined();
  });

  it('recreate disposes the old instance and loads a fresh one', async () => {
    const first = await getFfmpegRuntime();
    const second = await recreateFfmpegRuntime();

    expect(terminateMock).toHaveBeenCalledTimes(1);
    expect(loadMock).toHaveBeenCalledTimes(2);
    expect(second).not.toBe(first);
  });

  it('clears the in-flight load promise and rethrows on load failure', async () => {
    loadMock.mockRejectedValueOnce(new Error('boom'));

    await expect(getFfmpegRuntime()).rejects.toThrow('boom');

    // A subsequent call should attempt a fresh load rather than reuse a broken promise.
    loadMock.mockResolvedValueOnce(undefined);
    await expect(getFfmpegRuntime()).resolves.toBeTruthy();
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  it('forwards clamped progress ratios to the caller', async () => {
    const onProgress = vi.fn();
    await getFfmpegRuntime({ onProgress });

    expect(onMock).toHaveBeenCalledWith('progress', expect.any(Function));
    const progressCallback = onMock.mock.calls.find(([event]) => event === 'progress')[1];

    progressCallback({ progress: 1.5 });
    progressCallback({ progress: -0.5 });
    progressCallback({ progress: 0.42 });

    expect(onProgress).toHaveBeenNthCalledWith(1, 1);
    expect(onProgress).toHaveBeenNthCalledWith(2, 0);
    expect(onProgress).toHaveBeenNthCalledWith(3, 0.42);
  });

  it('times out a load that never resolves', async () => {
    vi.useFakeTimers();
    loadMock.mockImplementation(() => new Promise(() => {}));

    const promise = getFfmpegRuntime({ timeoutMs: 50 });
    const expectation = expect(promise).rejects.toThrow('FFmpeg load timed out');
    await vi.advanceTimersByTimeAsync(60);
    await expectation;

    vi.useRealTimers();
  });
});
