import { resolveOutputDimensions } from './image-adapter.js';
import { throwIfAborted } from './adapter-contract.js';

/**
 * Main-thread Canvas fallback when OffscreenCanvas is unavailable in worker.
 * @param {ImageBitmap | HTMLImageElement | HTMLCanvasElement} source
 * @param {string} outputFormat
 * @param {Record<string, unknown>} options
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>}
 */
export function encodeWithCanvasFallback(source, outputFormat, options = {}, signal) {
  throwIfAborted(signal);

  const srcW = 'width' in source ? source.width : 0;
  const srcH = 'height' in source ? source.height : 0;
  const { width, height } = resolveOutputDimensions(srcW, srcH, options);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.reject(new Error('Could not acquire canvas 2d context'));
  }

  if (outputFormat === 'jpeg' && options.flattenTransparency !== false) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(source, 0, 0, width, height);
  throwIfAborted(signal);

  const mime = outputFormat === 'png'
    ? 'image/png'
    : outputFormat === 'webp'
      ? 'image/webp'
      : 'image/jpeg';
  const quality = Math.min(1, Math.max(0.1, Number(options.quality ?? 0.92)));

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas encoding failed'));
          return;
        }
        resolve(blob);
      },
      mime,
      outputFormat === 'png' ? undefined : quality,
    );
  });
}

/**
 * @param {Blob} blob
 * @param {string} outputFormat
 * @param {Record<string, unknown>} options
 * @param {AbortSignal} [signal]
 * @returns {Promise<Blob>}
 */
export async function encodeBlobWithCanvasFallback(blob, outputFormat, options, signal) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url, signal);
    return encodeWithCanvasFallback(img, outputFormat, options, signal);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * @param {string} url
 * @param {AbortSignal} [signal]
 * @returns {Promise<HTMLImageElement>}
 */
function loadImage(url, signal) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const onAbort = () => {
      cleanup();
      reject(new Error('Cancelled'));
    };
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
    };
    signal?.addEventListener('abort', onAbort);
    img.onload = () => {
      cleanup();
      resolve(img);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}
