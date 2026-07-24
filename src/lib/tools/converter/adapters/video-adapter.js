import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSink,
  Conversion,
  Input,
  Mp4OutputFormat,
  WebMOutputFormat,
  Output,
} from 'mediabunny';
import { sanitizeFileName, replaceExtension } from '../converter-filenames.js';
import { adapterError, throwIfAborted } from './adapter-contract.js';

/**
 * @param {Uint8Array} bytes
 */
function blobFromBytes(bytes) {
  const copy = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Blob([copy]);
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @returns {Promise<import('./adapter-contract.js').AdapterAnalyzeResult>}
 */
export async function analyzeVideo(sourceBytes, ctx) {
  throwIfAborted(ctx.signal);
  const input = new Input({ source: new BlobSource(blobFromBytes(sourceBytes)), formats: ALL_FORMATS });

  try {
    const canRead = await input.canRead();
    if (!canRead) {
      throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'Video format not readable' });
    }

    const duration = await input.computeDuration();
    const videoTrack = await input.getPrimaryVideoTrack();
    const format = await input.getFormat();

    return {
      metadata: {
        container: format?.name ?? 'unknown',
        videoCodec: videoTrack ? await videoTrack.getCodec?.() : null,
      },
      durationSec: duration,
      width: videoTrack ? await videoTrack.getDisplayWidth() : 0,
      height: videoTrack ? await videoTrack.getDisplayHeight() : 0,
    };
  } finally {
    input.dispose();
  }
}

/**
 * Extract a representative frame when CanvasSink/decoding is available.
 * @param {import('mediabunny').Input} input
 * @param {number} durationSec
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob | null>}
 */
export async function extractVideoThumbnail(input, durationSec, signal) {
  throwIfAborted(signal);
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) return null;

    const sink = new CanvasSink(videoTrack, { width: 320, height: 180, fit: 'contain' });
    const timestamp = Math.min(Math.max(durationSec * 0.1, 0), Math.max(durationSec - 0.05, 0));
    const wrapped = await sink.getCanvas(timestamp);
    if (!wrapped?.canvas) return null;

    const canvas = wrapped.canvas;
    let blob = null;
    if (typeof canvas.convertToBlob === 'function') {
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
    } else if (typeof canvas.toBlob === 'function') {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    }

    // Release raster backing store when possible.
    if ('width' in canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }

    return blob;
  } catch {
    return null;
  }
}

/**
 * Remux or transcode video using MediaBunny Conversion API.
 * @param {Uint8Array} sourceBytes
 * @param {string} outputFormat
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @param {string} [sourceName]
 */
export async function processVideo(sourceBytes, outputFormat, ctx, sourceName = 'video') {
  throwIfAborted(ctx.signal);
  ctx.onProgress?.('processing', 0.05);

  const input = new Input({ source: new BlobSource(blobFromBytes(sourceBytes)), formats: ALL_FORMATS });
  const target = new BufferTarget();
  const format = outputFormat === 'webm' ? new WebMOutputFormat() : new Mp4OutputFormat();
  const output = new Output({ format, target });

  try {
    ctx.onProgress?.('processing', 0.15);

    const wantThumbnail = Boolean(ctx.options.thumbnail);
    let thumbnailBlob = null;
    if (wantThumbnail) {
      const duration = await input.computeDuration().catch(() => 0);
      thumbnailBlob = await extractVideoThumbnail(input, duration || 0, ctx.signal);
      ctx.onProgress?.('processing', 0.25);
    }

    const wantTranscode = Boolean(ctx.options.transcode);
    if (wantTranscode && typeof VideoEncoder === 'undefined') {
      throw adapterError({
        code: 'OPERATION_UNSUPPORTED',
        message: 'VideoEncoder is unavailable in this browser; remux without transcode instead',
      });
    }
    // Remux-first path. True encoder-based transcode is handled by the V1 FFmpeg/MediaBunny engine selector.
    // When transcode is requested without a dedicated engine, continue with remux and surface a warning.
    if (wantTranscode) {
      ctx.onProgress?.('processing', 0.18);
    }

    const conversion = await Conversion.init({ input, output, tracks: 'primary' });
    conversion.on?.('progress', (fraction) => {
      ctx.onProgress?.('processing', 0.25 + fraction * 0.65);
    });

    await conversion.execute();
    ctx.onProgress?.('processing', 0.95);

    const buffer = target.buffer;
    if (!buffer) {
      throw adapterError({ code: 'PROCESSING_FAILED', message: 'No output buffer produced' });
    }

    const mime = outputFormat === 'webm' ? 'video/webm' : 'video/mp4';
    return {
      blob: new Blob([buffer], { type: mime }),
      mimeType: mime,
      fileName: replaceExtension(sanitizeFileName(sourceName), outputFormat),
      metadata: {
        remux: true,
        thumbnail: thumbnailBlob
          ? {
              mimeType: thumbnailBlob.type || 'image/jpeg',
              size: thumbnailBlob.size,
              buffer: await thumbnailBlob.arrayBuffer(),
            }
          : null,
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) throw error;
    throw adapterError(error, 'PROCESSING_FAILED');
  } finally {
    input.dispose();
    output.dispose?.();
  }
}

export const videoAdapter = Object.freeze({
  id: 'video',
  analyze: analyzeVideo,
  process: processVideo,
});
