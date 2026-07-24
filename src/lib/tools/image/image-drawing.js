/**
 * @typedef {{ x: number, y: number }} StrokePoint
 * @typedef {{ points: StrokePoint[], color: string, width: number }} DrawStroke
 */

/**
 * @param {string} [color]
 * @param {number} [width]
 * @returns {DrawStroke}
 */
export function createStroke(color = '#ffffff', width = 4) {
  return { points: [], color, width: Math.max(1, width) };
}

/**
 * @param {DrawStroke} stroke
 * @param {number} x
 * @param {number} y
 */
export function appendStrokePoint(stroke, x, y) {
  stroke.points.push({ x, y });
  return stroke;
}

/**
 * Draw strokes in layer-local space (0..width, 0..height mapped from -w/2).
 * Strokes are stored in layer-local coordinates relative to layer top-left.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./image-document.js').ImageLayer} layer
 */
export function drawDrawingLayer(ctx, layer) {
  const strokes = layer.strokes || [];
  const w = layer.width;
  const h = layer.height;
  ctx.save();
  ctx.translate(-w / 2, -h / 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const stroke of strokes) {
    if (!stroke.points?.length) continue;
    ctx.strokeStyle = stroke.color || '#fff';
    ctx.lineWidth = stroke.width || 4;
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Expand layer bounds to include stroke points (optional grow).
 * @param {DrawStroke[]} strokes
 * @param {number} pad
 */
export function boundsFromStrokes(strokes, pad = 8) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s.points || []) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX)) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }
  return {
    x: minX - pad,
    y: minY - pad,
    width: Math.max(20, maxX - minX + pad * 2),
    height: Math.max(20, maxY - minY + pad * 2),
  };
}
