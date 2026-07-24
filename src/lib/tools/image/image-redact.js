/**
 * @typedef {'blackout'|'blur'|'pixelate'} RedactMode
 */

/**
 * @typedef {Object} RedactStyle
 * @property {RedactMode} mode
 * @property {number} strength  blur radius or pixel block size
 */

/** @returns {RedactStyle} */
export function defaultRedactStyle(mode = 'blackout') {
  return {
    mode,
    strength: mode === 'blackout' ? 1 : mode === 'blur' ? 12 : 10,
  };
}

/**
 * @param {Partial<RedactStyle> | null | undefined} value
 * @returns {RedactStyle}
 */
export function normalizeRedactStyle(value) {
  const base = defaultRedactStyle(value?.mode || 'blackout');
  if (!value || typeof value !== 'object') return base;
  return {
    mode: value.mode || base.mode,
    strength: Math.max(1, Math.min(64, Number(value.strength) || base.strength)),
  };
}

/**
 * Draw redact overlay. Blur/pixelate sample from the already-composited backdrop
 * when provided; otherwise blackout.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./image-document.js').ImageLayer} layer
 * @param {HTMLCanvasElement | null} [backdrop]
 */
export function drawRedactLayer(ctx, layer, backdrop = null) {
  const style = normalizeRedactStyle(layer.redact);
  const w = layer.width;
  const h = layer.height;
  const x = -w / 2;
  const y = -h / 2;

  if (style.mode === 'blackout' || !backdrop) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, w, h);
    return;
  }

  // Sample from document backdrop at layer position
  const sx = Math.round(layer.x);
  const sy = Math.round(layer.y);
  const sw = Math.max(1, Math.round(layer.width));
  const sh = Math.max(1, Math.round(layer.height));

  try {
    if (style.mode === 'blur') {
      ctx.save();
      ctx.filter = `blur(${style.strength}px)`;
      ctx.drawImage(backdrop, sx, sy, sw, sh, x, y, w, h);
      ctx.restore();
      return;
    }

    // pixelate
    const block = Math.max(2, Math.round(style.strength));
    const tiny = document.createElement('canvas');
    tiny.width = Math.max(1, Math.ceil(sw / block));
    tiny.height = Math.max(1, Math.ceil(sh / block));
    const tctx = tiny.getContext('2d');
    if (!tctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, w, h);
      return;
    }
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(backdrop, sx, sy, sw, sh, 0, 0, tiny.width, tiny.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, x, y, w, h);
    ctx.imageSmoothingEnabled = true;
  } catch {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, w, h);
  }
}
