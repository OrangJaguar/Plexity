/**
 * @typedef {'rect'|'roundRect'|'ellipse'|'line'|'arrow'} ShapeKind
 */

/**
 * @typedef {Object} ShapeStyle
 * @property {ShapeKind} shape
 * @property {string} stroke
 * @property {string} fill
 * @property {number} strokeWidth
 * @property {number} cornerRadius
 */

/** @returns {ShapeStyle} */
export function defaultShapeStyle(shape = 'rect') {
  return {
    shape,
    stroke: '#ffffff',
    fill: shape === 'line' || shape === 'arrow' ? 'transparent' : 'rgba(99, 120, 255, 0.25)',
    strokeWidth: 3,
    cornerRadius: shape === 'roundRect' ? 16 : 0,
  };
}

/**
 * @param {Partial<ShapeStyle> | null | undefined} value
 * @returns {ShapeStyle}
 */
export function normalizeShapeStyle(value) {
  const base = defaultShapeStyle(value?.shape || 'rect');
  if (!value || typeof value !== 'object') return base;
  return {
    ...base,
    ...value,
    strokeWidth: Math.max(0, Math.min(64, Number(value.strokeWidth) || base.strokeWidth)),
    cornerRadius: Math.max(0, Number(value.cornerRadius) || 0),
  };
}

/**
 * Draw shape centered at origin with layer width/height.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./image-document.js').ImageLayer} layer
 */
export function drawShapeLayer(ctx, layer) {
  const style = normalizeShapeStyle(layer.shape);
  const w = layer.width;
  const h = layer.height;
  const x = -w / 2;
  const y = -h / 2;
  ctx.lineWidth = style.strokeWidth;
  ctx.strokeStyle = style.stroke;
  ctx.fillStyle = style.fill;

  if (style.shape === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (style.fill && style.fill !== 'transparent') ctx.fill();
    if (style.strokeWidth > 0) ctx.stroke();
    return;
  }

  if (style.shape === 'line' || style.shape === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.stroke();
    if (style.shape === 'arrow') {
      const head = Math.min(18, w * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + w, 0);
      ctx.lineTo(x + w - head, -head * 0.55);
      ctx.moveTo(x + w, 0);
      ctx.lineTo(x + w - head, head * 0.55);
      ctx.stroke();
    }
    return;
  }

  // rect / roundRect
  const r = style.shape === 'roundRect' ? Math.min(style.cornerRadius, w / 2, h / 2) : 0;
  ctx.beginPath();
  if (r > 0 && typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else if (r > 0) {
    roundRectPath(ctx, x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
  if (style.fill && style.fill !== 'transparent') ctx.fill();
  if (style.strokeWidth > 0) ctx.stroke();
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** @type {{ id: ShapeKind, label: string }[]} */
export const SHAPE_CATALOG = [
  { id: 'rect', label: 'Rectangle' },
  { id: 'roundRect', label: 'Rounded' },
  { id: 'ellipse', label: 'Ellipse' },
  { id: 'line', label: 'Line' },
  { id: 'arrow', label: 'Arrow' },
];
