import { canvasToBlob, cloneCanvas, drawToCanvas } from './image-decode.js';
import { fitWithinEdge } from './image-decode.js';

/**
 * @typedef {'png' | 'jpeg' | 'webp'} ImageExportFormat
 */

/**
 * @typedef {Object} ImageExportOptions
 * @property {ImageExportFormat} format
 * @property {number} [quality] 0..1
 * @property {number} [maxEdge]
 */

const MIME = Object.freeze({
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
});

/**
 * @param {ImageExportFormat} format
 */
export function mimeForExportFormat(format) {
  return MIME[format] ?? 'image/png';
}

/**
 * Flatten transparency onto white for JPEG.
 * @param {HTMLCanvasElement} source
 * @returns {HTMLCanvasElement}
 */
export function flattenOnWhite(source) {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  return out;
}

/**
 * @param {HTMLCanvasElement} composite
 * @param {ImageExportOptions} options
 * @returns {Promise<{ blob: Blob, mime: string, width: number, height: number }>}
 */
export async function exportComposite(composite, options) {
  const format = options.format || 'png';
  const quality = Number.isFinite(options.quality) ? options.quality : 0.92;
  let canvas = cloneCanvas(composite);

  if (options.maxEdge && options.maxEdge > 0) {
    const fit = fitWithinEdge(canvas.width, canvas.height, options.maxEdge);
    if (fit.scale < 1) {
      canvas = drawToCanvas(canvas, fit.width, fit.height);
    }
  }

  if (format === 'jpeg') {
    canvas = flattenOnWhite(canvas);
  }

  const mime = mimeForExportFormat(format);
  const blob = await canvasToBlob(canvas, mime, format === 'png' ? undefined : quality);
  return { blob, mime, width: canvas.width, height: canvas.height };
}

/**
 * @param {string} title
 * @param {ImageExportFormat} format
 */
export function exportFileName(title, format) {
  const stem = String(title || 'image')
    .trim()
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'image';
  const ext = format === 'jpeg' ? 'jpg' : format;
  return `${stem}.${ext}`;
}
