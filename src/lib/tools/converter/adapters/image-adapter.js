import { sanitizeFileName, replaceExtension } from '../converter-filenames.js';
import { adapterError, throwIfAborted } from './adapter-contract.js';

const OUTPUT_MIME = Object.freeze({
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
});

/**
 * @param {string} format
 * @returns {string}
 */
function mimeForFormat(format) {
  return OUTPUT_MIME[format] ?? 'application/octet-stream';
}

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} maxW
 * @param {number} maxH
 * @returns {{ width: number, height: number }}
 */
export function computeFitDimensions(srcW, srcH, maxW, maxH) {
  if (!maxW && !maxH) return { width: srcW, height: srcH };
  const ratio = srcW / srcH;
  let width = srcW;
  let height = srcH;
  if (maxW && width > maxW) {
    width = maxW;
    height = Math.round(width / ratio);
  }
  if (maxH && height > maxH) {
    height = maxH;
    width = Math.round(height * ratio);
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

/**
 * Resolve output pixel size, supporting optional upscale via `scale`.
 * @param {number} srcW
 * @param {number} srcH
 * @param {Record<string, unknown>} options
 * @returns {{ width: number, height: number }}
 */
export function resolveOutputDimensions(srcW, srcH, options = {}) {
  const scale = Number(options.scale);
  if (Number.isFinite(scale) && scale > 0 && Math.abs(scale - 1) > 0.001) {
    return {
      width: Math.max(1, Math.round(srcW * scale)),
      height: Math.max(1, Math.round(srcH * scale)),
    };
  }
  const maxWidth = Number(options.maxWidth) || 0;
  const maxHeight = Number(options.maxHeight) || 0;
  const exactWidth = Number(options.exactWidth) || 0;
  const exactHeight = Number(options.exactHeight) || 0;
  if (exactWidth > 0 && exactHeight > 0) {
    return { width: Math.max(1, Math.round(exactWidth)), height: Math.max(1, Math.round(exactHeight)) };
  }
  if (exactWidth > 0) {
    const height = Math.max(1, Math.round(exactWidth * (srcH / srcW)));
    return { width: Math.max(1, Math.round(exactWidth)), height };
  }
  if (exactHeight > 0) {
    const width = Math.max(1, Math.round(exactHeight * (srcW / srcH)));
    return { width, height: Math.max(1, Math.round(exactHeight)) };
  }
  return computeFitDimensions(srcW, srcH, maxWidth || srcW, maxHeight || srcH);
}

/**
 * @param {ImageBitmap} bitmap
 * @param {string} outputFormat
 * @param {Record<string, unknown>} options
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>}
 */
export async function encodeImageBitmap(bitmap, outputFormat, options = {}, signal) {
  throwIfAborted(signal);

  const { width, height } = resolveOutputDimensions(bitmap.width, bitmap.height, options);

  if (typeof OffscreenCanvas === 'undefined') {
    const { encodeWithCanvasFallback } = await import('./image-fallback.js');
    return encodeWithCanvasFallback(bitmap, outputFormat, options, signal);
  }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw adapterError({ code: 'PROCESSING_FAILED', message: 'Could not acquire 2d context' });
  }

  if (outputFormat === 'jpeg' && options.flattenTransparency !== false) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  throwIfAborted(signal);

  const quality = clamp(Number(options.quality ?? 0.92), 0.1, 1);
  const mime = mimeForFormat(outputFormat);
  return canvas.convertToBlob({
    type: mime,
    quality: outputFormat === 'png' ? undefined : quality,
  });
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @returns {Promise<import('./adapter-contract.js').AdapterAnalyzeResult>}
 */
export async function analyzeImage(sourceBytes, ctx) {
  throwIfAborted(ctx.signal);
  const blob = new Blob([sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength)]);
  const bitmap = await createImageBitmap(blob);
  try {
    return {
      metadata: { format: 'image' },
      width: bitmap.width,
      height: bitmap.height,
    };
  } finally {
    bitmap.close();
  }
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {string} outputFormat
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @param {string} [sourceName]
 * @returns {Promise<import('./adapter-contract.js').AdapterProcessResult>}
 */
/**
 * @param {Uint8Array} sourceBytes
 * @param {Record<string, unknown>} options
 * @returns {Promise<ImageBitmap>}
 */
async function decodeImageBitmap(sourceBytes, options) {
  const blob = new Blob([sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength)]);
  if (options.rasterizeAnimation !== false && isLikelyGif(sourceBytes)) {
    return createImageBitmap(blob, { imageOrientation: 'from-image' });
  }
  return createImageBitmap(blob);
}

/**
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
function isLikelyGif(bytes) {
  return bytes.length >= 3 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46;
}

export async function processImage(sourceBytes, outputFormat, ctx, sourceName = 'image') {
  throwIfAborted(ctx.signal);
  ctx.onProgress?.('processing', 0.1);

  const bitmap = await decodeImageBitmap(sourceBytes, ctx.options);

  try {
    ctx.onProgress?.('processing', 0.4);
    const outBlob = await encodeImageBitmap(bitmap, outputFormat, ctx.options, ctx.signal);
    ctx.onProgress?.('processing', 0.95);

    const { width, height } = resolveOutputDimensions(bitmap.width, bitmap.height, ctx.options);

    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    return {
      blob: outBlob,
      mimeType: mimeForFormat(outputFormat),
      fileName: replaceExtension(sanitizeFileName(sourceName), ext),
      metadata: {
        width,
        height,
        sourceWidth: bitmap.width,
        sourceHeight: bitmap.height,
        metadataPolicy: ctx.options.metadataPolicy ?? 'keep',
      },
    };
  } finally {
    bitmap.close();
  }
}

export const imageAdapter = Object.freeze({
  id: 'image',
  analyze: analyzeImage,
  process: processImage,
});
