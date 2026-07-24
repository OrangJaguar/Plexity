/**
 * @typedef {Object} TextStyle
 * @property {string} text
 * @property {string} fontFamily
 * @property {number} fontSize
 * @property {string} fontWeight  normal | bold
 * @property {string} fontStyle   normal | italic
 * @property {boolean} underline
 * @property {'left'|'center'|'right'} align
 * @property {string} color
 */

/** @returns {TextStyle} */
export function defaultTextStyle() {
  return {
    text: 'Text',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: 32,
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    align: 'left',
    color: '#ffffff',
  };
}

/**
 * @param {Partial<TextStyle> | null | undefined} value
 * @returns {TextStyle}
 */
export function normalizeTextStyle(value) {
  const base = defaultTextStyle();
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    ...value,
    fontSize: Math.max(8, Math.min(400, Number(value.fontSize) || base.fontSize)),
    text: String(value.text ?? base.text),
  };
}

/**
 * Draw text layer into a canvas context at layer local origin (-w/2, -h/2) after transform setup.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./image-document.js').ImageLayer} layer
 */
export function drawTextLayer(ctx, layer) {
  const style = normalizeTextStyle(layer.text);
  const w = layer.width;
  const h = layer.height;
  ctx.fillStyle = style.color;
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = style.align === 'center' ? 'center' : style.align === 'right' ? 'right' : 'left';
  const x = style.align === 'center' ? 0 : style.align === 'right' ? w / 2 : -w / 2;
  const y = -h / 2 + Math.max(0, (h - style.fontSize) / 2);
  const lines = String(style.text).split('\n');
  lines.forEach((line, i) => {
    const ly = y + i * style.fontSize * 1.25;
    ctx.fillText(line, x, ly);
    if (style.underline) {
      const metrics = ctx.measureText(line);
      const tw = metrics.width;
      let ux = x;
      if (style.align === 'center') ux = x - tw / 2;
      if (style.align === 'right') ux = x - tw;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(1, style.fontSize / 16);
      ctx.beginPath();
      ctx.moveTo(ux, ly + style.fontSize + 2);
      ctx.lineTo(ux + tw, ly + style.fontSize + 2);
      ctx.stroke();
    }
  });
}

/**
 * Estimate box size for text.
 * @param {TextStyle} style
 * @param {number} [maxWidth]
 */
export function measureTextBox(style, maxWidth = 400) {
  const s = normalizeTextStyle(style);
  const lines = String(s.text).split('\n');
  const width = Math.min(maxWidth, Math.max(80, Math.round(s.fontSize * Math.max(...lines.map((l) => l.length), 4) * 0.55)));
  const height = Math.max(s.fontSize + 16, Math.round(lines.length * s.fontSize * 1.35 + 8));
  return { width, height };
}
