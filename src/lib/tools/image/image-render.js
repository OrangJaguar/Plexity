import { applyAdjustToImageData, isIdentityAdjust, normalizeAdjustParams } from './image-adjust.js';
import { applyFilterToCanvas } from './image-filters.js';
import { applyMaskAsAlpha } from './image-erase.js';
import { cloneCanvas, getImageData, canvasFromImageData } from './image-decode.js';
import { drawTextLayer } from './image-text.js';
import { drawShapeLayer } from './image-shapes.js';
import { drawDrawingLayer } from './image-drawing.js';
import { drawRedactLayer } from './image-redact.js';

/**
 * @param {import('./image-document.js').ImageLayer} layer
 * @returns {HTMLCanvasElement | null}
 */
export function renderLayerBitmap(layer) {
  if (!layer.source) return null;

  const hasFx = Boolean(
    (layer.filterId && layer.filterId !== 'none')
    || !isIdentityAdjust(normalizeAdjustParams(layer.adjust))
    || layer.mask,
  );

  // Fast path: no filter/adjust/mask — draw source directly (caller scales).
  if (!hasFx) return layer.source;

  const cacheKey = `${layer.filterId || ''}|${JSON.stringify(layer.adjust || {})}|${layer.mask?._eraseGen || 0}|${layer.source.width}x${layer.source.height}`;
  if (layer._bitmapCache && layer._bitmapCacheKey === cacheKey) {
    return layer._bitmapCache;
  }

  let canvas = cloneCanvas(layer.source);

  if (layer.filterId && layer.filterId !== 'none') {
    canvas = applyFilterToCanvas(canvas, layer.filterId);
  }

  const adjust = normalizeAdjustParams(layer.adjust);
  if (!isIdentityAdjust(adjust)) {
    const data = getImageData(canvas);
    applyAdjustToImageData(data, adjust);
    canvas = canvasFromImageData(data);
  }

  if (layer.mask) {
    canvas = applyMaskAsAlpha(canvas, layer.mask);
  }

  layer._bitmapCache = canvas;
  layer._bitmapCacheKey = cacheKey;
  return canvas;
}

/**
 * Draw a single layer onto ctx (document space). Assumes no prior transform.
 * @param {CanvasRenderingContext2D} ctx
 * @param {import('./image-document.js').ImageLayer} layer
 * @param {{ compareOriginal?: boolean, backdrop?: HTMLCanvasElement | null }} [opts]
 */
export function drawLayerOnContext(ctx, layer, opts = {}) {
  if (!layer.visible) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, layer.opacity));
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate((layer.rotation * Math.PI) / 180);
  ctx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);

  if (layer.type === 'image' || (layer.type === 'graphic' && layer.source)) {
    const bitmap = opts.compareOriginal && layer.originalSource
      ? layer.originalSource
      : (layer.type === 'image' ? renderLayerBitmap(layer) : layer.source);
    if (bitmap) {
      ctx.drawImage(bitmap, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    }
  } else if (layer.type === 'graphic' && layer.graphicSvg) {
    // Fallback when rasterization failed — visible dashed frame so placement is obvious
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
  } else if (layer.type === 'text') {
    drawTextLayer(ctx, layer);
  } else if (layer.type === 'shape') {
    drawShapeLayer(ctx, layer);
  } else if (layer.type === 'drawing') {
    drawDrawingLayer(ctx, layer);
  } else if (layer.type === 'redact') {
    drawRedactLayer(ctx, layer, opts.backdrop || null);
  }

  ctx.restore();
}

/**
 * @param {import('./image-document.js').ImageDocument} doc
 * @param {{ compareOriginal?: boolean }} [opts]
 * @returns {HTMLCanvasElement}
 */
/**
 * Compare view: pristine uploaded image(s) only — no annotations, masks, filters, or overlays.
 * @param {import('./image-document.js').ImageDocument} doc
 * @returns {HTMLCanvasElement}
 */
export function compositeCompareOriginal(doc) {
  const out = document.createElement('canvas');
  out.width = Math.max(1, doc.canvasWidth);
  out.height = Math.max(1, doc.canvasHeight);
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  for (const layer of doc.layers) {
    if (!layer.visible || layer.type !== 'image') continue;
    const bitmap = layer.originalSource || layer.source;
    if (!bitmap) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.max(0, layer.opacity));
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1);
    ctx.drawImage(bitmap, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
    ctx.restore();
  }

  return out;
}

export function compositeDocument(doc, opts = {}) {
  if (opts.compareOriginal) {
    return compositeCompareOriginal(doc);
  }

  const out = document.createElement('canvas');
  out.width = Math.max(1, doc.canvasWidth);
  out.height = Math.max(1, doc.canvasHeight);
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  const hasRedact = doc.layers.some((l) => l.visible && l.type === 'redact');
  let backdrop = null;
  let bctx = null;
  if (hasRedact) {
    backdrop = document.createElement('canvas');
    backdrop.width = out.width;
    backdrop.height = out.height;
    bctx = backdrop.getContext('2d');
  }

  for (const layer of doc.layers) {
    if (!layer.visible) continue;
    if (layer.type === 'redact') continue;
    if (bctx) drawLayerOnContext(bctx, layer, opts);
    drawLayerOnContext(ctx, layer, opts);
  }

  if (hasRedact) {
    for (const layer of doc.layers) {
      if (!layer.visible || layer.type !== 'redact') continue;
      drawLayerOnContext(ctx, layer, { ...opts, backdrop });
    }
  }

  return out;
}

/**
 * @param {import('./image-document.js').ImageDocument} doc
 */
export function estimateDocumentBytes(doc) {
  let sum = 0;
  for (const layer of doc.layers) {
    if (layer._fileBytes) sum += layer._fileBytes;
    else if (layer.source) sum += layer.source.width * layer.source.height * 4 * 0.25;
    else sum += layer.width * layer.height * 2;
  }
  return Math.round(sum);
}
