import { defaultAdjustParams, normalizeAdjustParams } from './image-adjust.js';
import { cloneCanvas } from './image-decode.js';
import { createOpaqueMask, ensureMaskSize } from './image-erase.js';
import { IMAGE_HISTORY_LIMIT } from './image-limits.js';
import { defaultTextStyle, normalizeTextStyle, measureTextBox } from './image-text.js';
import { defaultShapeStyle, normalizeShapeStyle } from './image-shapes.js';
import { defaultRedactStyle, normalizeRedactStyle } from './image-redact.js';

/**
 * @typedef {'image'|'text'|'shape'|'drawing'|'graphic'|'redact'} LayerType
 */

/**
 * @typedef {Object} ImageLayer
 * @property {string} id
 * @property {LayerType} type
 * @property {string} name
 * @property {boolean} isBackground
 * @property {HTMLCanvasElement | null} [source]
 * @property {HTMLCanvasElement | null} [originalSource]
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {number} rotation
 * @property {number} opacity
 * @property {boolean} flipH
 * @property {boolean} flipV
 * @property {boolean} visible
 * @property {boolean} locked
 * @property {import('./image-adjust.js').ImageAdjustParams} [adjust]
 * @property {string | null} [filterId]
 * @property {HTMLCanvasElement | null} [mask]
 * @property {import('./image-text.js').TextStyle} [text]
 * @property {import('./image-shapes.js').ShapeStyle} [shape]
 * @property {import('./image-drawing.js').DrawStroke[]} [strokes]
 * @property {string | null} [graphicId]
 * @property {string | null} [graphicSvg]
 * @property {import('./image-redact.js').RedactStyle} [redact]
 */

/**
 * @typedef {Object} ImageDocument
 * @property {string} title
 * @property {number} canvasWidth
 * @property {number} canvasHeight
 * @property {ImageLayer[]} layers  bottom → top
 * @property {string | null} selectedLayerId
 * @property {number} estimatedBytes
 */

function sharedTransform(x = 0, y = 0, width = 100, height = 100) {
  return {
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    flipH: false,
    flipV: false,
    visible: true,
    locked: false,
    isBackground: false,
  };
}

/**
 * @returns {ImageDocument}
 */
export function createEmptyDocument() {
  return {
    title: '',
    canvasWidth: 0,
    canvasHeight: 0,
    layers: [],
    selectedLayerId: null,
    estimatedBytes: 0,
  };
}

/**
 * @param {object} opts
 * @returns {ImageLayer}
 */
export function createImageLayer({
  id,
  name,
  canvas,
  isBackground = false,
  x = 0,
  y = 0,
  fileBytes = 0,
}) {
  return {
    id,
    type: 'image',
    name,
    isBackground,
    source: canvas,
    originalSource: cloneCanvas(canvas),
    ...sharedTransform(x, y, canvas.width, canvas.height),
    isBackground,
    adjust: defaultAdjustParams(),
    filterId: null,
    mask: null,
    _fileBytes: fileBytes,
  };
}

/**
 * @param {object} opts
 * @returns {ImageLayer}
 */
export function createTextLayer({
  id = crypto.randomUUID(),
  name = 'Text',
  x = 40,
  y = 40,
  text,
}) {
  const style = normalizeTextStyle(text || defaultTextStyle());
  const box = measureTextBox(style);
  return {
    id,
    type: 'text',
    name,
    source: null,
    originalSource: null,
    ...sharedTransform(x, y, box.width, box.height),
    text: style,
  };
}

/**
 * @param {object} opts
 * @returns {ImageLayer}
 */
export function createShapeLayer({
  id = crypto.randomUUID(),
  name,
  x = 60,
  y = 60,
  width = 160,
  height = 100,
  shape,
}) {
  const style = normalizeShapeStyle(shape || defaultShapeStyle('rect'));
  return {
    id,
    type: 'shape',
    name: name || style.shape,
    source: null,
    originalSource: null,
    ...sharedTransform(x, y, width, height),
    shape: style,
  };
}

/**
 * @param {object} opts
 * @returns {ImageLayer}
 */
export function createDrawingLayer({
  id = crypto.randomUUID(),
  name = 'Drawing',
  x = 0,
  y = 0,
  width = 200,
  height = 200,
  strokes = [],
}) {
  return {
    id,
    type: 'drawing',
    name,
    source: null,
    originalSource: null,
    ...sharedTransform(x, y, width, height),
    strokes: strokes.map((s) => ({
      ...s,
      points: (s.points || []).map((p) => ({ ...p })),
    })),
  };
}

/**
 * @param {object} opts
 * @returns {ImageLayer}
 */
export function createGraphicLayer({
  id = crypto.randomUUID(),
  name,
  x = 80,
  y = 80,
  width = 96,
  height = 96,
  graphicId,
  graphicSvg,
  canvas = null,
}) {
  return {
    id,
    type: 'graphic',
    name: name || graphicId || 'Graphic',
    source: canvas,
    originalSource: canvas ? cloneCanvas(canvas) : null,
    ...sharedTransform(x, y, width, height),
    graphicId: graphicId || null,
    graphicSvg: graphicSvg || null,
  };
}

/**
 * @param {object} opts
 * @returns {ImageLayer}
 */
export function createRedactLayer({
  id = crypto.randomUUID(),
  name = 'Redact',
  x = 40,
  y = 40,
  width = 120,
  height = 40,
  redact,
}) {
  return {
    id,
    type: 'redact',
    name,
    source: null,
    originalSource: null,
    ...sharedTransform(x, y, width, height),
    redact: normalizeRedactStyle(redact || defaultRedactStyle()),
  };
}

/**
 * @param {ImageLayer} layer
 * @returns {ImageLayer}
 */
export function cloneLayer(layer) {
  const base = {
    ...layer,
    text: layer.text ? normalizeTextStyle(layer.text) : undefined,
    shape: layer.shape ? normalizeShapeStyle(layer.shape) : undefined,
    redact: layer.redact ? normalizeRedactStyle(layer.redact) : undefined,
    strokes: layer.strokes
      ? layer.strokes.map((s) => ({
        ...s,
        points: (s.points || []).map((p) => ({ ...p })),
      }))
      : undefined,
    adjust: layer.adjust ? normalizeAdjustParams(layer.adjust) : undefined,
    source: layer.source ? cloneCanvas(layer.source) : null,
    originalSource: layer.originalSource ? cloneCanvas(layer.originalSource) : null,
    mask: layer.mask ? cloneCanvas(layer.mask) : null,
  };
  return base;
}

/**
 * @param {ImageDocument} doc
 * @returns {ImageDocument}
 */
export function cloneDocument(doc) {
  return {
    title: doc.title,
    canvasWidth: doc.canvasWidth,
    canvasHeight: doc.canvasHeight,
    selectedLayerId: doc.selectedLayerId,
    estimatedBytes: doc.estimatedBytes,
    layers: doc.layers.map((layer) => cloneLayer(layer)),
  };
}

/** @param {ImageDocument} doc @param {string} layerId */
export function getLayer(doc, layerId) {
  return doc.layers.find((l) => l.id === layerId) ?? null;
}

/** @param {ImageDocument} doc */
export function getSelectedLayer(doc) {
  if (!doc.selectedLayerId) return doc.layers[doc.layers.length - 1] ?? null;
  return getLayer(doc, doc.selectedLayerId) ?? doc.layers[doc.layers.length - 1] ?? null;
}

/** @param {ImageDocument} doc @param {Partial<ImageDocument>} patch */
export function patchDocument(doc, patch) {
  return { ...doc, ...patch };
}

/** @param {ImageDocument} doc @param {string} layerId @param {Partial<ImageLayer>} patch */
export function patchLayer(doc, layerId, patch) {
  return {
    ...doc,
    layers: doc.layers.map((l) => (l.id === layerId ? { ...l, ...patch } : l)),
  };
}

/** @param {ImageDocument} doc @param {ImageLayer} layer */
export function addLayer(doc, layer) {
  return {
    ...doc,
    layers: [...doc.layers, layer],
    selectedLayerId: layer.id,
  };
}

export function reorderLayers(doc, fromIndex, toIndex) {
  if (fromIndex === toIndex) return doc;
  const layers = [...doc.layers];
  const [item] = layers.splice(fromIndex, 1);
  layers.splice(toIndex, 0, item);
  return { ...doc, layers };
}

/**
 * @param {ImageDocument} doc
 * @param {string} layerId
 * @param {'forward'|'backward'|'front'|'back'} action
 */
export function moveLayerZ(doc, layerId, action) {
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  if (idx < 0) return doc;
  let to = idx;
  if (action === 'forward') to = Math.min(doc.layers.length - 1, idx + 1);
  if (action === 'backward') to = Math.max(0, idx - 1);
  if (action === 'front') to = doc.layers.length - 1;
  if (action === 'back') to = 0;
  return reorderLayers(doc, idx, to);
}

export function duplicateLayer(doc, layerId) {
  const layer = getLayer(doc, layerId);
  if (!layer) return doc;
  const copy = cloneLayer(layer);
  copy.id = crypto.randomUUID();
  copy.name = `${layer.name} copy`;
  copy.isBackground = false;
  copy.x = layer.x + 16;
  copy.y = layer.y + 16;
  const idx = doc.layers.findIndex((l) => l.id === layerId);
  const layers = [...doc.layers];
  layers.splice(idx + 1, 0, copy);
  return { ...doc, layers, selectedLayerId: copy.id };
}

export function deleteLayer(doc, layerId) {
  const layers = doc.layers.filter((l) => l.id !== layerId);
  if (!layers.length) return createEmptyDocument();
  let canvasWidth = doc.canvasWidth;
  let canvasHeight = doc.canvasHeight;
  const removed = doc.layers.find((l) => l.id === layerId);
  if (removed?.isBackground) {
    const nextBg = layers.find((l) => l.type === 'image') || layers[0];
    if (nextBg) {
      const idx = layers.findIndex((l) => l.id === nextBg.id);
      layers[idx] = {
        ...nextBg,
        isBackground: nextBg.type === 'image',
        x: nextBg.type === 'image' ? 0 : nextBg.x,
        y: nextBg.type === 'image' ? 0 : nextBg.y,
      };
      if (nextBg.type === 'image' && nextBg.source) {
        canvasWidth = nextBg.source.width;
        canvasHeight = nextBg.source.height;
        layers[idx].width = canvasWidth;
        layers[idx].height = canvasHeight;
      }
    }
  }
  const selectedLayerId = doc.selectedLayerId === layerId
    ? layers[layers.length - 1].id
    : doc.selectedLayerId;
  return { ...doc, layers, canvasWidth, canvasHeight, selectedLayerId };
}

/**
 * Promote an image layer to background.
 * @param {ImageDocument} doc
 * @param {string} layerId
 */
export function setLayerAsBackground(doc, layerId) {
  const layer = getLayer(doc, layerId);
  if (!layer || layer.type !== 'image' || !layer.source) return doc;
  const layers = doc.layers.map((l) => ({
    ...l,
    isBackground: l.id === layerId,
  }));
  const bg = layers.find((l) => l.id === layerId);
  if (!bg) return doc;
  bg.x = 0;
  bg.y = 0;
  bg.width = layer.source.width;
  bg.height = layer.source.height;
  bg.rotation = 0;
  // move to bottom
  const without = layers.filter((l) => l.id !== layerId);
  return {
    ...doc,
    canvasWidth: bg.width,
    canvasHeight: bg.height,
    layers: [bg, ...without],
    selectedLayerId: layerId,
  };
}

export function layerWithMask(layer) {
  if (!layer.source) return layer;
  const mask = ensureMaskSize(layer.mask, layer.source.width, layer.source.height)
    ?? createOpaqueMask(layer.source.width, layer.source.height);
  return { ...layer, mask };
}

export function createImageHistory(limit = IMAGE_HISTORY_LIMIT) {
  /** @type {ImageDocument[]} */
  let past = [];
  /** @type {ImageDocument[]} */
  let future = [];

  return {
    /** @param {ImageDocument} doc */
    push(doc) {
      past.push(cloneDocument(doc));
      if (past.length > limit) past.shift();
      future = [];
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
    /** @param {ImageDocument} current */
    undo(current) {
      if (!past.length) return null;
      future.push(cloneDocument(current));
      return past.pop() ?? null;
    },
    /** @param {ImageDocument} current */
    redo(current) {
      if (!future.length) return null;
      past.push(cloneDocument(current));
      return future.pop() ?? null;
    },
    clear() {
      past = [];
      future = [];
    },
  };
}
