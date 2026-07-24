/**
 * @typedef {{ x: number, y: number, width: number, height: number }} CropRect
 */

/**
 * @typedef {{ id: string, label: string, ratio: number | null }} CropAspectPreset
 * ratio null = freeform; 0 = original (caller supplies)
 */

/** @type {CropAspectPreset[]} */
export const CROP_ASPECT_PRESETS = [
  { id: 'freeform', label: 'Freeform', ratio: null },
  { id: 'original', label: 'Original', ratio: 0 },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:5', label: '4:5', ratio: 4 / 5 },
  { id: '5:4', label: '5:4', ratio: 5 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
];

/**
 * Full-frame crop for a bitmap size.
 * @param {number} width
 * @param {number} height
 * @returns {CropRect}
 */
export function fullCropRect(width, height) {
  return { x: 0, y: 0, width, height };
}

/**
 * @param {CropRect} rect
 * @param {number} imgW
 * @param {number} imgH
 * @returns {CropRect}
 */
export function clampCropRect(rect, imgW, imgH) {
  let { x, y, width, height } = rect;
  width = Math.max(1, Math.min(width, imgW));
  height = Math.max(1, Math.min(height, imgH));
  x = Math.min(Math.max(0, x), imgW - width);
  y = Math.min(Math.max(0, y), imgH - height);
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Fit a crop rect to an aspect ratio inside image bounds, centered on current rect.
 * @param {CropRect} current
 * @param {number} imgW
 * @param {number} imgH
 * @param {number | null} ratio  width/height; null keeps freeform; 0 uses img aspect
 * @returns {CropRect}
 */
export function applyAspectToCrop(current, imgW, imgH, ratio) {
  if (ratio == null) return clampCropRect(current, imgW, imgH);
  const target = ratio === 0 ? imgW / imgH : ratio;
  const cx = current.x + current.width / 2;
  const cy = current.y + current.height / 2;
  let width = current.width;
  let height = width / target;
  if (height > imgH) {
    height = imgH;
    width = height * target;
  }
  if (width > imgW) {
    width = imgW;
    height = width / target;
  }
  return clampCropRect(
    { x: cx - width / 2, y: cy - height / 2, width, height },
    imgW,
    imgH,
  );
}

/**
 * Crop source canvas to rect; returns new canvas.
 * @param {HTMLCanvasElement} source
 * @param {CropRect} rect
 * @returns {HTMLCanvasElement}
 */
export function cropCanvas(source, rect) {
  const r = clampCropRect(rect, source.width, source.height);
  const out = document.createElement('canvas');
  out.width = r.width;
  out.height = r.height;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.drawImage(source, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height);
  return out;
}

/**
 * Rotate canvas by degrees around center; expands bounds to fit.
 * @param {HTMLCanvasElement} source
 * @param {number} degrees
 * @returns {HTMLCanvasElement}
 */
export function rotateCanvas(source, degrees) {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = source.width;
  const h = source.height;
  const outW = Math.max(1, Math.round(w * cos + h * sin));
  const outH = Math.max(1, Math.round(w * sin + h * cos));
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.translate(outW / 2, outH / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -w / 2, -h / 2);
  return out;
}
