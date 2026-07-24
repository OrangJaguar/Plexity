/**
 * Lazy-loaded FFmpeg runtime (v0.12 @ffmpeg/ffmpeg API).
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const CORE_JS = '/converter-runtime/ffmpeg/ffmpeg-core.js';
const CORE_WASM = '/converter-runtime/ffmpeg/ffmpeg-core.wasm';
const DEFAULT_LOAD_TIMEOUT_MS = 120_000;

/** @type {FFmpeg | null} */
let instance = null;
/** @type {Promise<FFmpeg> | null} */
let loadPromise = null;
/** @type {((ratio: number) => void) | null} */
let progressHandler = null;

/**
 * @param {object} [options]
 * @param {number} [options.timeoutMs]
 * @param {(ratio: number) => void} [options.onProgress]
 * @returns {Promise<FFmpeg>}
 */
export async function getFfmpegRuntime(options = {}) {
  if (instance?.loaded) {
    if (options.onProgress) progressHandler = options.onProgress;
    return instance;
  }

  if (loadPromise) return loadPromise;

  loadPromise = loadInstance(options.timeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS, options.onProgress);
  try {
    instance = await loadPromise;
    return instance;
  } catch (error) {
    loadPromise = null;
    throw error;
  }
}

/**
 * @param {number} timeoutMs
 * @param {(ratio: number) => void} [onProgress]
 */
async function loadInstance(timeoutMs, onProgress) {
  const ffmpeg = new FFmpeg();
  progressHandler = onProgress ?? null;

  ffmpeg.on('progress', ({ progress }) => {
    progressHandler?.(Math.min(1, Math.max(0, progress ?? 0)));
  });

  const loadTask = ffmpeg.load({
    coreURL: await toBlobURL(CORE_JS, 'text/javascript'),
    wasmURL: await toBlobURL(CORE_WASM, 'application/wasm'),
  });

  await withTimeout(loadTask, timeoutMs, 'FFmpeg load timed out');
  return ffmpeg;
}

/**
 * @returns {boolean}
 */
export function isFfmpegLoaded() {
  return Boolean(instance?.loaded);
}

/**
 * Terminate and clear cached instance.
 */
export async function disposeFfmpegRuntime() {
  if (instance) {
    try {
      await instance.terminate();
    } catch {
      // ignore terminate errors
    }
  }
  instance = null;
  loadPromise = null;
  progressHandler = null;
}

/**
 * Force recreate on next getFfmpegRuntime call.
 */
export async function recreateFfmpegRuntime(options = {}) {
  await disposeFfmpegRuntime();
  return getFfmpegRuntime(options);
}

/**
 * @param {Promise<unknown>} promise
 * @param {number} timeoutMs
 * @param {string} message
 */
function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export { CORE_JS, CORE_WASM, DEFAULT_LOAD_TIMEOUT_MS };
