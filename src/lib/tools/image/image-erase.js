/**
 * Create a full-opaque alpha mask matching canvas size.
 * @param {number} width
 * @param {number} height
 * @returns {HTMLCanvasElement}
 */
export function createOpaqueMask(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

/**
 * Ensure mask matches source dimensions.
 * @param {HTMLCanvasElement | null} mask
 * @param {number} width
 * @param {number} height
 */
export function ensureMaskSize(mask, width, height) {
  if (mask && mask.width === width && mask.height === height) return mask;
  const next = createOpaqueMask(width, height);
  if (mask) {
    const ctx = next.getContext('2d');
    ctx?.drawImage(mask, 0, 0);
  }
  return next;
}

/**
 * Paint circular brush on mask. Erase = black, Restore = white.
 * @param {HTMLCanvasElement} mask
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {'erase' | 'restore'} mode
 */
export function paintMaskBrush(mask, x, y, radius, mode) {
  const ctx = mask.getContext('2d');
  if (!ctx) return;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = mode === 'erase' ? '#000000' : '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
  ctx.fill();
  mask._eraseGen = (mask._eraseGen || 0) + 1;
}

/**
 * Paint a continuous stroke between two points (fixes dotted eraser at normal pointer speed).
 * @param {HTMLCanvasElement} mask
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} radius
 * @param {'erase' | 'restore'} mode
 */
export function paintMaskStroke(mask, x0, y0, x1, y1, radius, mode) {
  const r = Math.max(1, radius);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.5) {
    paintMaskBrush(mask, x1, y1, r, mode);
    return;
  }
  const step = Math.max(1, r * 0.35);
  const steps = Math.ceil(dist / step);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    paintMaskBrush(mask, x0 + dx * t, y0 + dy * t, r, mode);
  }
}

/**
 * Apply luminance mask as alpha onto a copy of source.
 * White = opaque, black = transparent.
 * Uses canvas compositing when possible (much faster than per-pixel loops).
 * @param {HTMLCanvasElement} source
 * @param {HTMLCanvasElement} mask
 * @returns {HTMLCanvasElement}
 */
export function applyMaskAsAlpha(source, mask) {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d', { willReadFrequently: false });
  if (!ctx) throw new Error('Canvas 2D unavailable');

  // Convert luminance mask → alpha mask via a temp canvas, then destination-in.
  const alpha = document.createElement('canvas');
  alpha.width = mask.width;
  alpha.height = mask.height;
  const actx = alpha.getContext('2d', { willReadFrequently: true });
  if (!actx) {
    ctx.drawImage(source, 0, 0);
    return out;
  }
  actx.drawImage(mask, 0, 0);
  const m = actx.getImageData(0, 0, alpha.width, alpha.height);
  for (let i = 0; i < m.data.length; i += 4) {
    m.data[i + 3] = m.data[i];
    m.data[i] = 255;
    m.data[i + 1] = 255;
    m.data[i + 2] = 255;
  }
  actx.putImageData(m, 0, 0);

  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(alpha, 0, 0, out.width, out.height);
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/**
 * Merge rembg/cutout canvas alpha into mask (where cutout is transparent, mask goes black).
 * @param {HTMLCanvasElement} mask
 * @param {HTMLCanvasElement} cutout
 */
export function mergeCutoutIntoMask(mask, cutout) {
  const sized = ensureMaskSize(mask, cutout.width, cutout.height);
  const ctx = sized.getContext('2d');
  const cctx = cutout.getContext('2d');
  if (!ctx || !cctx) return sized;
  const m = ctx.getImageData(0, 0, sized.width, sized.height);
  const c = cctx.getImageData(0, 0, cutout.width, cutout.height);
  for (let i = 0; i < m.data.length; i += 4) {
    const a = c.data[i + 3];
    m.data[i] = a;
    m.data[i + 1] = a;
    m.data[i + 2] = a;
    m.data[i + 3] = 255;
  }
  ctx.putImageData(m, 0, 0);
  return sized;
}
