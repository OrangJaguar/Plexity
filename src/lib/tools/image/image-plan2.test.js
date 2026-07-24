import { describe, expect, it } from 'vitest';
import {
  createEmptyDocument,
  createTextLayer,
  createShapeLayer,
  createDrawingLayer,
  createRedactLayer,
  createGraphicLayer,
  addLayer,
  moveLayerZ,
  duplicateLayer,
  cloneLayer,
  setLayerAsBackground,
} from '@/lib/tools/image/image-document.js';
import { hitTestLayer } from '@/lib/tools/image/image-hit-test.js';
import { searchElements, GRAPHIC_CATALOG, SHAPE_ITEMS } from '@/lib/tools/image/image-elements-catalog.js';
import { normalizeTextStyle, measureTextBox } from '@/lib/tools/image/image-text.js';
import { normalizeShapeStyle, defaultShapeStyle } from '@/lib/tools/image/image-shapes.js';
import { normalizeRedactStyle } from '@/lib/tools/image/image-redact.js';
import { createStroke, appendStrokePoint, boundsFromStrokes } from '@/lib/tools/image/image-drawing.js';

describe('plan2 layer factories', () => {
  it('creates text/shape/drawing/redact/graphic layers', () => {
    expect(createTextLayer({}).type).toBe('text');
    expect(createShapeLayer({ shape: defaultShapeStyle('ellipse') }).shape.shape).toBe('ellipse');
    expect(createDrawingLayer({}).strokes).toEqual([]);
    expect(createRedactLayer({}).redact.mode).toBe('blackout');
    expect(createGraphicLayer({ graphicId: 'star', graphicSvg: '<svg/>' }).graphicId).toBe('star');
  });

  it('adds and reorders layers in z', () => {
    let doc = createEmptyDocument();
    doc = { ...doc, canvasWidth: 400, canvasHeight: 300 };
    const a = createTextLayer({ id: 'a', name: 'A' });
    const b = createShapeLayer({ id: 'b', name: 'B' });
    doc = addLayer(doc, a);
    doc = addLayer(doc, b);
    expect(doc.layers.map((l) => l.id)).toEqual(['a', 'b']);
    doc = moveLayerZ(doc, 'a', 'front');
    expect(doc.layers.map((l) => l.id)).toEqual(['b', 'a']);
  });

  it('duplicates non-image layers without canvas', () => {
    let doc = createEmptyDocument();
    doc = { ...doc, canvasWidth: 200, canvasHeight: 200 };
    const t = createTextLayer({ id: 't', name: 'Hello' });
    doc = addLayer(doc, t);
    const next = duplicateLayer(doc, 't');
    expect(next.layers).toHaveLength(2);
    expect(next.layers[1].type).toBe('text');
    expect(next.layers[1].id).not.toBe('t');
  });
});

describe('plan2 hit-test', () => {
  it('picks topmost visible layer', () => {
    const doc = {
      ...createEmptyDocument(),
      canvasWidth: 100,
      canvasHeight: 100,
      layers: [
        { ...createShapeLayer({ id: 'bottom', x: 0, y: 0, width: 100, height: 100 }), visible: true },
        { ...createTextLayer({ id: 'top', x: 10, y: 10 }), width: 40, height: 20, visible: true },
      ],
    };
    expect(hitTestLayer(doc, 15, 15)?.id).toBe('top');
    expect(hitTestLayer(doc, 90, 90)?.id).toBe('bottom');
  });
});

describe('plan2 elements search', () => {
  it('filters graphics and shapes', () => {
    expect(searchElements('graphics', 'heart').some((i) => i.id === 'heart')).toBe(true);
    expect(searchElements('shapes', 'ellip').length).toBeGreaterThan(0);
    expect(GRAPHIC_CATALOG.length).toBeGreaterThan(20);
    expect(SHAPE_ITEMS.length).toBe(5);
  });

  it('searches session images', () => {
    const items = searchElements('images', 'cat', [{ id: '1', name: 'cat.png' }, { id: '2', name: 'dog.jpg' }]);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('1');
  });
});

describe('plan2 style helpers', () => {
  it('normalizes text/shape/redact and stroke bounds', () => {
    expect(normalizeTextStyle({ fontSize: 999 }).fontSize).toBe(400);
    expect(measureTextBox(normalizeTextStyle({ text: 'Hi' })).width).toBeGreaterThan(0);
    expect(normalizeShapeStyle({ shape: 'arrow' }).shape).toBe('arrow');
    expect(normalizeRedactStyle({ mode: 'blur', strength: 100 }).strength).toBe(64);
    const stroke = createStroke('#fff', 4);
    appendStrokePoint(stroke, 10, 10);
    appendStrokePoint(stroke, 50, 40);
    const b = boundsFromStrokes([stroke]);
    expect(b.width).toBeGreaterThan(20);
  });

  it('clones layer deeply for clipboard', () => {
    const layer = createDrawingLayer({
      strokes: [{ color: '#f00', width: 2, points: [{ x: 1, y: 2 }] }],
    });
    const copy = cloneLayer(layer);
    copy.strokes[0].points[0].x = 99;
    expect(layer.strokes[0].points[0].x).toBe(1);
  });
});

describe('plan2 background promote', () => {
  it('setLayerAsBackground no-ops without image source', () => {
    let doc = createEmptyDocument();
    doc = { ...doc, canvasWidth: 100, canvasHeight: 80 };
    const img = {
      ...createGraphicLayer({ id: 'g', name: 'G', graphicId: 'x', graphicSvg: '<svg/>' }),
      type: 'image',
      source: null,
      isBackground: false,
    };
    doc = addLayer(doc, img);
    const next = setLayerAsBackground(doc, 'g');
    expect(next).toBe(doc);
  });
});
