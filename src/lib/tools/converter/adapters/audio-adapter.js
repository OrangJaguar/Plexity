import { sanitizeFileName, replaceExtension } from '../converter-filenames.js';
import { adapterError, throwIfAborted } from './adapter-contract.js';
import { runFfmpegJob } from '../ffmpeg/ffmpeg-runner.js';

const OUTPUT_MIME = Object.freeze({
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  opus: 'audio/opus',
});

/**
 * @param {string} outputFormat
 * @returns {string}
 */
function mimeForOutput(outputFormat) {
  return OUTPUT_MIME[outputFormat] ?? 'application/octet-stream';
}

/**
 * @param {string} operationId
 * @returns {{ builderName: string, outputExt: string }}
 */
function resolveFfmpegBuilder(operationId) {
  if (operationId.startsWith('extract-audio-')) {
    const match = operationId.match(/^extract-audio-[^-]+(?:-[^-]+)*-to-([a-z0-9]+)$/i)
      ?? operationId.match(/^extract-audio-.+-to-([a-z0-9]+)$/i);
    // Prefer explicit -to-{fmt}; default extract-audio-{fmt} stays mp3.
    const outputExt = match?.[1] ?? 'mp3';
    return { builderName: 'extractAudioFromVideo', outputExt };
  }
  if (operationId.endsWith('-to-mp3')) {
    return { builderName: 'convertAudioToMp3', outputExt: 'mp3' };
  }
  if (operationId.endsWith('-to-wav')) {
    return { builderName: 'convertAudioGeneric', outputExt: 'wav' };
  }
  return { builderName: 'convertAudioGeneric', outputExt: operationId.split('-to-').pop() ?? 'mp3' };
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @returns {Promise<import('./adapter-contract.js').AdapterAnalyzeResult>}
 */
export async function analyzeAudio(sourceBytes, ctx) {
  throwIfAborted(ctx.signal);
  return {
    metadata: { format: 'audio', bytes: sourceBytes.byteLength },
    durationSec: null,
    channels: null,
  };
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {string} operationId
 * @param {string} inputFormat
 * @param {string} outputFormat
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @param {string} [sourceName]
 */
export async function processAudio(sourceBytes, operationId, inputFormat, outputFormat, ctx, sourceName = 'audio') {
  throwIfAborted(ctx.signal);
  ctx.onProgress?.('processing', 0.05);

  const { builderName, outputExt } = resolveFfmpegBuilder(operationId);
  const ext = outputFormat === 'jpeg' ? 'jpg' : outputExt;

  /** @type {Record<string, unknown>} */
  const builderParams = {
    bitrateKbps: ctx.options.bitrateKbps ?? 192,
    inputExt: inputFormat,
    outputExt: ext,
  };
  if (ctx.options.metadataPolicy === 'strip' || ctx.options.metadataPolicy === 'minimal') {
    builderParams.stripMetadata = true;
  }

  const result = await runFfmpegJob({
    builderName,
    builderParams,
    sourceBytes,
    inputExt: inputFormat,
    outputExt: ext,
    mimeType: mimeForOutput(outputFormat),
    fileName: replaceExtension(sanitizeFileName(sourceName), ext),
    signal: ctx.signal,
    onProgress: (ratio) => ctx.onProgress?.('processing', 0.1 + ratio * 0.85),
  });

  ctx.onProgress?.('processing', 0.95);
  return {
    blob: result.blob,
    mimeType: result.mimeType,
    fileName: result.fileName,
    metadata: result.metadata,
  };
}

export const audioAdapter = Object.freeze({
  id: 'audio',
  analyze: analyzeAudio,
  process: processAudio,
});
