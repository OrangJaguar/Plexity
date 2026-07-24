import { getOperationById } from '../conversion-capabilities.js';
import { imageAdapter, processImage } from './image-adapter.js';
import { wavAdapter, processWav } from './wav-adapter.js';
import { videoAdapter, processVideo } from './video-adapter.js';
import { dataAdapter, analyzeData, processData } from './data-adapter.js';
import { audioAdapter, analyzeAudio, processAudio } from './audio-adapter.js';
import { adapterError, throwIfAborted } from './adapter-contract.js';

/** @type {Record<string, object>} */
const ADAPTERS = Object.freeze({
  image: imageAdapter,
  wav: wavAdapter,
  video: videoAdapter,
  data: dataAdapter,
  audio: audioAdapter,
});

/**
 * @param {string} operationId
 * @returns {object}
 */
export function getAdapterForOperation(operationId) {
  const op = getOperationById(operationId);
  if (!op) {
    throw adapterError({ code: 'OPERATION_UNSUPPORTED', message: `Unknown operation: ${operationId}` });
  }
  const adapter = ADAPTERS[op.adapter];
  if (!adapter) {
    throw adapterError({ code: 'OPERATION_UNSUPPORTED', message: `Unknown adapter: ${op.adapter}` });
  }
  return adapter;
}

/**
 * @param {string} operationId
 * @param {Uint8Array} sourceBytes
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @param {string} [sourceName]
 */
export async function analyzeWithAdapter(operationId, sourceBytes, ctx, sourceName) {
  throwIfAborted(ctx.signal);
  const op = getOperationById(operationId);
  if (!op) throw adapterError({ code: 'OPERATION_UNSUPPORTED', message: `Unknown operation: ${operationId}` });

  switch (op.adapter) {
    case 'image':
      return imageAdapter.analyze(sourceBytes, ctx);
    case 'wav':
      return wavAdapter.analyze(sourceBytes, ctx);
    case 'video':
      return videoAdapter.analyze(sourceBytes, ctx);
    case 'data':
      return analyzeData(sourceBytes, op.inputFormats[0], ctx);
    case 'audio':
      return analyzeAudio(sourceBytes, ctx);
    default:
      throw adapterError({ code: 'OPERATION_UNSUPPORTED', message: `Unsupported adapter: ${op.adapter}` });
  }
}

/**
 * @param {string} operationId
 * @param {Uint8Array} sourceBytes
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @param {string} [sourceName]
 */
export async function processWithAdapter(operationId, sourceBytes, ctx, sourceName) {
  throwIfAborted(ctx.signal);
  const op = getOperationById(operationId);
  if (!op) throw adapterError({ code: 'OPERATION_UNSUPPORTED', message: `Unknown operation: ${operationId}` });

  switch (op.adapter) {
    case 'image':
      return processImage(sourceBytes, op.outputFormat, ctx, sourceName);
    case 'wav':
      return processWav(sourceBytes, ctx, sourceName);
    case 'video':
      return processVideo(sourceBytes, op.outputFormat, ctx, sourceName);
    case 'data':
      return processData(sourceBytes, op.inputFormats[0], op.outputFormat, ctx, sourceName);
    case 'audio':
      return processAudio(sourceBytes, op.id, op.inputFormats[0], op.outputFormat, ctx, sourceName);
    default:
      throw adapterError({ code: 'OPERATION_UNSUPPORTED', message: `Unsupported adapter: ${op.adapter}` });
  }
}

export { ADAPTERS };
