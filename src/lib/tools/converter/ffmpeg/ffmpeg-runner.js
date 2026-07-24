/**
 * Serialized main-thread FFmpeg runner — one job at a time.
 */

import { fetchFile } from '@ffmpeg/util';
import {
  buildFfmpegArgv,
  sanitizeVirtualName,
  sanitizeVirtualOutput,
} from './ffmpeg-operations.js';
import { disposeFfmpegRuntime, getFfmpegRuntime, recreateFfmpegRuntime } from './ffmpeg-runtime.js';

/** @typedef {{ blob: Blob, mimeType: string, fileName?: string, metadata?: Record<string, unknown> }} FfmpegRunResult */

/**
 * @typedef {object} FfmpegJob
 * @property {string} builderName
 * @property {object} builderParams
 * @property {Uint8Array} sourceBytes
 * @property {string} inputExt
 * @property {string} outputExt
 * @property {string} mimeType
 * @property {string} [fileName]
 * @property {AbortSignal} [signal]
 * @property {(ratio: number) => void} [onProgress]
 */

/** @type {Promise<unknown> | null} */
let chain = Promise.resolve();
/** @type {AbortController | null} */
let activeAbort = null;

/**
 * @param {FfmpegJob} job
 * @returns {Promise<FfmpegRunResult>}
 */
export function runFfmpegJob(job) {
  const task = chain.then(() => executeJob(job));
  chain = task.catch(() => {});
  return task;
}

/**
 * Cancel active job and recreate FFmpeg instance.
 */
export async function cancelFfmpegJob() {
  activeAbort?.abort();
  await recreateFfmpegRuntime();
}

/**
 * @param {FfmpegJob} job
 */
async function executeJob(job) {
  if (job.signal?.aborted) {
    throw normalizeFfmpegError(new Error('Cancelled'), 'CANCELLED');
  }

  const controller = new AbortController();
  activeAbort = controller;
  const onAbort = () => controller.abort();
  job.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const ffmpeg = await getFfmpegRuntime({ onProgress: job.onProgress });
    const inputName = sanitizeVirtualName(job.inputExt);
    const outputName = sanitizeVirtualOutput(job.outputExt);
    const argv = buildFfmpegArgv(job.builderName, {
      ...job.builderParams,
      inputExt: job.inputExt,
      outputExt: job.outputExt,
    });

    await ffmpeg.writeFile(inputName, await fetchFile(new Blob([job.sourceBytes])));
    await ffmpeg.exec(argv);

    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));

    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});

    return {
      blob: new Blob([bytes], { type: job.mimeType }),
      mimeType: job.mimeType,
      fileName: job.fileName,
      metadata: { engine: 'ffmpeg' },
    };
  } catch (error) {
    if (controller.signal.aborted || job.signal?.aborted) {
      await recreateFfmpegRuntime();
      throw normalizeFfmpegError(new Error('Cancelled'), 'CANCELLED');
    }
    throw normalizeFfmpegError(error, 'PROCESSING_FAILED');
  } finally {
    job.signal?.removeEventListener('abort', onAbort);
    activeAbort = null;
  }
}

/**
 * @param {unknown} error
 * @param {string} [code]
 * @returns {Error & { code: string }}
 */
export function normalizeFfmpegError(error, code = 'PROCESSING_FAILED') {
  const message = error instanceof Error ? error.message : String(error ?? 'FFmpeg error');
  const err = new Error(message);
  /** @type {Record<string, unknown>} */ (err).code = code;
  return /** @type {Error & { code: string }} */ (err);
}

export async function disposeFfmpegRunner() {
  await disposeFfmpegRuntime();
  chain = Promise.resolve();
}
