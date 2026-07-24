import {
  EVENT_TYPES,
  normalizeWorkerError,
  PROTOCOL_VERSION,
  REQUEST_TYPES,
  collectEventTransferables,
  serializeWorkerEvent,
  validateWorkerRequest,
} from '../lib/tools/converter/converter-worker-protocol.js';
import { analyzeWithAdapter, processWithAdapter } from '../lib/tools/converter/adapters/index.js';

/** @type {Map<string, AbortController>} */
const activeJobs = new Map();

/**
 * @param {object} event
 */
function postEvent(event) {
  const message = serializeWorkerEvent(event);
  const transfer = collectEventTransferables(message);
  self.postMessage(message, transfer);
}

/**
 * @param {object} params
 */
function postError(params) {
  postEvent({
    type: EVENT_TYPES.ERROR,
    jobId: params.jobId,
    attemptId: params.attemptId,
    code: params.code,
    message: params.message,
    details: params.details,
  });
}

postEvent({ type: EVENT_TYPES.READY, protocolVersion: PROTOCOL_VERSION });

self.onmessage = async (event) => {
  const validated = validateWorkerRequest(event.data);
  if (!validated.ok) {
    postError({
      code: 'PROTOCOL_ERROR',
      message: /** @type {{ ok: false, error: string }} */ (validated).error,
    });
    return;
  }

  const msg = validated.value;

  if (msg.type === REQUEST_TYPES.DISPOSE) {
    for (const controller of activeJobs.values()) controller.abort();
    activeJobs.clear();
    return;
  }

  if (msg.type === REQUEST_TYPES.CANCEL) {
    const key = `${msg.jobId}:${msg.attemptId}`;
    activeJobs.get(key)?.abort();
    activeJobs.delete(key);
    postEvent({ type: EVENT_TYPES.CANCELLED, jobId: msg.jobId, attemptId: msg.attemptId });
    return;
  }

  const key = `${msg.jobId}:${msg.attemptId}`;
  activeJobs.get(key)?.abort();
  const controller = new AbortController();
  activeJobs.set(key, controller);

  const sourceBytes = /** @type {Uint8Array | undefined} */ (event.data?.sourceBytes);
  if (!sourceBytes) {
    postError({ jobId: msg.jobId, attemptId: msg.attemptId, code: 'PROTOCOL_ERROR', message: 'Missing source bytes' });
    return;
  }

  const ctx = {
    operationId: msg.operationId,
    options: msg.options ?? {},
    signal: controller.signal,
    onProgress: (phase, fraction) => {
      postEvent({
        type: EVENT_TYPES.PROGRESS,
        jobId: msg.jobId,
        attemptId: msg.attemptId,
        phase,
        fraction,
      });
    },
  };

  try {
    if (msg.type === REQUEST_TYPES.ANALYZE) {
      ctx.onProgress('analyzing', 0.1);
      const analysis = await analyzeWithAdapter(msg.operationId, sourceBytes, ctx);
      ctx.onProgress('analyzing', 1);
      postEvent({
        type: EVENT_TYPES.RESULT,
        jobId: msg.jobId,
        attemptId: msg.attemptId,
        kind: 'analysis',
        payload: analysis,
      });
    } else if (msg.type === REQUEST_TYPES.PROCESS) {
      ctx.onProgress('processing', 0.05);
      const output = await processWithAdapter(msg.operationId, sourceBytes, ctx, msg.sourceName);
      ctx.onProgress('processing', 1);
      const buffer = await output.blob.arrayBuffer();
      postEvent({
        type: EVENT_TYPES.RESULT,
        jobId: msg.jobId,
        attemptId: msg.attemptId,
        kind: 'output',
        payload: {
          buffer,
          mimeType: output.mimeType,
          fileName: output.fileName,
          metadata: output.metadata ?? {},
        },
      });
    }
  } catch (error) {
    const normalized = normalizeWorkerError(error);
    postError({
      jobId: msg.jobId,
      attemptId: msg.attemptId,
      code: normalized.code,
      message: normalized.message,
      details: normalized.details,
    });
  } finally {
    activeJobs.delete(key);
  }
};
