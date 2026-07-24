import { IMAGE_WORKING_MAX_EDGE, megapixelInfo } from './image-limits.js';

/**
 * @param {number} srcW
 * @param {number} srcH
 * @param {number} maxEdge
 */
export function fitWithinEdge(srcW, srcH, maxEdge = IMAGE_WORKING_MAX_EDGE) {
  const long = Math.max(srcW, srcH);
  if (long <= maxEdge) return { width: srcW, height: srcH, scale: 1 };
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
    scale,
  };
}

/**
 * @param {CanvasImageSource} source
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
export function drawToCanvas(source, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * @param {Blob | File} blob
 * @returns {Promise<{
 *   canvas: HTMLCanvasElement,
 *   naturalWidth: number,
 *   naturalHeight: number,
 *   workingWidth: number,
 *   workingHeight: number,
 *   megapixels: number,
 *   warnMegapixels: boolean,
 *   downsampled: boolean,
 * }>}
 */
export async function decodeImageBlob(blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const naturalWidth = bitmap.width;
    const naturalHeight = bitmap.height;
    const fit = fitWithinEdge(naturalWidth, naturalHeight);
    const canvas = drawToCanvas(bitmap, fit.width, fit.height);
    const info = megapixelInfo(naturalWidth, naturalHeight);
    return {
      canvas,
      naturalWidth,
      naturalHeight,
      workingWidth: fit.width,
      workingHeight: fit.height,
      megapixels: info.megapixels,
      warnMegapixels: info.warn,
      downsampled: fit.scale < 1,
    };
  } finally {
    bitmap.close?.();
  }
}

/**
 * Clone a canvas into a new canvas.
 * @param {HTMLCanvasElement} source
 * @returns {HTMLCanvasElement}
 */
export function cloneCanvas(source) {
  return drawToCanvas(source, source.width, source.height);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {ImageData}
 */
export function getImageData(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * @param {ImageData} imageData
 * @returns {HTMLCanvasElement}
 */
export function canvasFromImageData(imageData) {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} mime
 * @param {number} [quality]
 * @returns {Promise<Blob>}
 */
export function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Failed to encode image'));
        else resolve(blob);
      },
      mime,
      quality,
    );
  });
}

/**
 * Format byte size for UI.
 * @param {number} bytes
 */
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
