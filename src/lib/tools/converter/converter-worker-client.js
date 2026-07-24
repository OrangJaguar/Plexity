import {
  EVENT_TYPES,
  normalizeWorkerError,
  REQUEST_TYPES,
  validateWorkerEvent,
  validateWorkerRequest,
} from './converter-worker-protocol.js';
import { ERROR_CODES } from './converter-job-model.js';

const DEFAULT_READY_TIMEOUT_MS = 10_000;
const DEFAULT_OPERATION_TIMEOUT_MS = 5 * 60_000;

/**
 * @typedef {object} WorkerClientOptions
 * @property {number} [readyTimeoutMs]
 * @property {number} [operationTimeoutMs]
 * @property {() => Worker} [createWorker]
 */

/**
 * @param {WorkerClientOptions} [options]
 */
export function createConverterWorkerClient(options = {}) {
  const readyTimeoutMs = options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS;
  const operationTimeoutMs = options.operationTimeoutMs ?? DEFAULT_OPERATION_TIMEOUT_MS;

  /**
   * @param {object} params
   * @param {string} params.jobId
   * @param {string} params.attemptId
   * @param {string} params.operationId
   * @param {Uint8Array} params.sourceBytes
   * @param {Record<string, unknown>} [params.options]
   * @param {'analyze' | 'process'} params.mode
   * @param {'native' | 'mediabunny' | 'ffmpeg'} [params.engine]
   * @param {(phase: 'loading-engine' | 'analyzing' | 'processing' | 'packaging', fraction: number) => void} [params.onProgress]
   * @returns {Promise<{ cancel: () => void, dispose: () => void, result: Promise<unknown> }>}
   */
  function startJob(params) {
    const worker = options.createWorker?.() ?? new Worker(
      new URL('../../../workers/converter.worker.js', import.meta.url),
      { type: 'module' },
    );

    let disposed = false;
    let ready = false;
    /** @type {AbortController | null} */
    let abortController = new AbortController();

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      abortController?.abort();
      abortController = null;
      worker.terminate();
    };

    const result = new Promise((resolve, reject) => {
      /** @type {ReturnType<typeof setTimeout> | null} */
      let readyTimer = setTimeout(() => {
        cleanup();
        reject(normalizeClientError({ code: ERROR_CODES.WORKER_TIMEOUT, message: 'Worker ready timeout' }));
      }, readyTimeoutMs);

      /** @type {ReturnType<typeof setTimeout> | null} */
      let opTimer = null;

      const resetOpTimer = () => {
        if (opTimer) clearTimeout(opTimer);
        opTimer = setTimeout(() => {
          cleanup();
          reject(normalizeClientError({ code: ERROR_CODES.WORKER_TIMEOUT, message: 'Worker operation timeout' }));
        }, operationTimeoutMs);
      };

      worker.onmessage = (event) => {
        const validated = validateWorkerEvent(event.data);
        if (!validated.ok) {
          cleanup();
          reject(normalizeClientError({ code: ERROR_CODES.WORKER_CRASHED, message: validated.error }));
          return;
        }

        const msg = validated.value;
        if (msg.jobId && msg.jobId !== params.jobId) return;
        if (msg.attemptId && msg.attemptId !== params.attemptId) return;

        switch (msg.type) {
          case EVENT_TYPES.READY:
            ready = true;
            if (readyTimer) clearTimeout(readyTimer);
            resetOpTimer();
            const owned = new Uint8Array(params.sourceBytes.byteLength);
            owned.set(params.sourceBytes);
            worker.postMessage({
              type: params.mode === 'analyze' ? REQUEST_TYPES.ANALYZE : REQUEST_TYPES.PROCESS,
              protocolVersion: 1,
              jobId: params.jobId,
              attemptId: params.attemptId,
              operationId: params.operationId,
              options: params.options ?? {},
              sourceName: params.sourceName,
              sourceBytes: owned,
              ...(params.mode !== 'analyze' && params.engine ? { engine: params.engine } : {}),
            }, [owned.buffer]);
            break;

          case EVENT_TYPES.PROGRESS:
            resetOpTimer();
            params.onProgress?.(msg.phase, msg.fraction);
            break;

          case EVENT_TYPES.RESULT:
            if (opTimer) clearTimeout(opTimer);
            cleanup();
            resolve(msg.payload);
            break;

          case EVENT_TYPES.CANCELLED:
            if (opTimer) clearTimeout(opTimer);
            cleanup();
            reject(normalizeClientError({ code: ERROR_CODES.CANCELLED, message: 'Cancelled' }));
            break;

          case EVENT_TYPES.ERROR:
            if (opTimer) clearTimeout(opTimer);
            cleanup();
            reject(normalizeClientError(msg));
            break;

          default:
            break;
        }
      };

      worker.onerror = () => {
        cleanup();
        reject(normalizeClientError({ code: ERROR_CODES.WORKER_CRASHED, message: 'Worker crashed' }));
      };

      worker.onmessageerror = () => {
        cleanup();
        reject(normalizeClientError({ code: ERROR_CODES.WORKER_CRASHED, message: 'Malformed worker message' }));
      };
    });

    return {
      cancel() {
        if (disposed) return;
        try {
          worker.postMessage({
            type: REQUEST_TYPES.CANCEL,
            protocolVersion: 1,
            jobId: params.jobId,
            attemptId: params.attemptId,
          });
        } catch {
          cleanup();
        }
      },
      dispose: cleanup,
      result,
    };
  }

  return { startJob };
}

/**
 * @param {object} error
 * @returns {Error & { code: string }}
 */
export function normalizeClientError(error) {
  const normalized = normalizeWorkerError(error);
  const err = new Error(normalized.message);
  err.code = normalized.code;
  return err;
}
