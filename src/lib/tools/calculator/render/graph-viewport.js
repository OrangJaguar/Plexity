export function createViewport(overrides = {}) {
  return {
    xMin: overrides.xMin ?? -10,
    xMax: overrides.xMax ?? 10,
    yMin: overrides.yMin ?? -10,
    yMax: overrides.yMax ?? 10,
  };
}

export function worldToScreen(x, y, viewport, width, height) {
  const sx = ((x - viewport.xMin) / (viewport.xMax - viewport.xMin)) * width;
  const sy = height - ((y - viewport.yMin) / (viewport.yMax - viewport.yMin)) * height;
  return { x: sx, y: sy };
}

export function screenToWorld(sx, sy, viewport, width, height) {
  const x = viewport.xMin + (sx / width) * (viewport.xMax - viewport.xMin);
  const y = viewport.yMin + ((height - sy) / height) * (viewport.yMax - viewport.yMin);
  return { x, y };
}

export function zoomAt(viewport, sx, sy, width, height, factor) {
  const center = screenToWorld(sx, sy, viewport, width, height);
  const xSpan = (viewport.xMax - viewport.xMin) / factor;
  const ySpan = (viewport.yMax - viewport.yMin) / factor;
  const xRatio = (center.x - viewport.xMin) / (viewport.xMax - viewport.xMin);
  const yRatio = (center.y - viewport.yMin) / (viewport.yMax - viewport.yMin);
  return {
    xMin: center.x - xSpan * xRatio,
    xMax: center.x + xSpan * (1 - xRatio),
    yMin: center.y - ySpan * yRatio,
    yMax: center.y + ySpan * (1 - yRatio),
  };
}

export function pan(viewport, dxScreen, dyScreen, width, height) {
  const xSpan = viewport.xMax - viewport.xMin;
  const ySpan = viewport.yMax - viewport.yMin;
  const dx = (-dxScreen / width) * xSpan;
  const dy = (dyScreen / height) * ySpan;
  return {
    xMin: viewport.xMin + dx,
    xMax: viewport.xMax + dx,
    yMin: viewport.yMin + dy,
    yMax: viewport.yMax + dy,
  };
}

export function resetHome() {
  return createViewport();
}

import { evaluateAtX } from '@/lib/tools/calculator/engine/sampler-2d';

function roundBound(n) {
  if (!Number.isFinite(n)) return 0;
  const mag = Math.max(Math.abs(n), 1e-6);
  const precision = mag >= 100 ? 0 : mag >= 10 ? 1 : 2;
  return Number(n.toFixed(precision));
}

export function stabilizeViewport(vp) {
  return {
    xMin: roundBound(vp.xMin),
    xMax: roundBound(vp.xMax),
    yMin: roundBound(vp.yMin),
    yMax: roundBound(vp.yMax),
  };
}

/**
 * Compute a sensible fixed viewport for visible graphable expressions.
 * Samples across a standard x-window without using the current y-bounds (avoids feedback loops).
 */
export function computeSmartViewport(compiled, scope, expressions, xWindow = { min: -10, max: 10 }) {
  const visibleIds = new Set(expressions.filter((e) => e.visible).map((e) => e.id));
  let yMin = Infinity;
  let yMax = -Infinity;
  let hasCurve = false;

  const xMin = xWindow.min;
  const xMax = xWindow.max;
  const steps = 256;

  for (const item of compiled) {
    if (!item.graphable || item.error || !visibleIds.has(item.id)) continue;
    hasCurve = true;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + ((xMax - xMin) * i) / steps;
      const result = evaluateAtX(item.graphable.body, scope, x);
      if (result.ok && Number.isFinite(result.value)) {
        yMin = Math.min(yMin, result.value);
        yMax = Math.max(yMax, result.value);
      }
    }
  }

  if (!hasCurve || !Number.isFinite(yMin)) {
    return stabilizeViewport(createViewport());
  }

  const ySpan = Math.max(yMax - yMin, 1);
  const yPad = Math.max(0.5, ySpan * 0.12);
  const xSpan = xMax - xMin;
  const xPad = xSpan * 0.04;

  return stabilizeViewport({
    xMin: xMin - xPad,
    xMax: xMax + xPad,
    yMin: yMin - yPad,
    yMax: yMax + yPad,
  });
}

export function autoFitCurves(curves, padding = 0.1) {
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  for (const curve of curves) {
    for (const seg of curve.segments) {
      for (const pt of seg) {
        if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y)) continue;
        xMin = Math.min(xMin, pt.x);
        xMax = Math.max(xMax, pt.x);
        yMin = Math.min(yMin, pt.y);
        yMax = Math.max(yMax, pt.y);
      }
    }
  }

  if (!Number.isFinite(xMin)) return resetHome();

  const xPad = (xMax - xMin || 2) * padding;
  const yPad = (yMax - yMin || 2) * padding;
  return {
    xMin: xMin - xPad,
    xMax: xMax + xPad,
    yMin: yMin - yPad,
    yMax: yMax + yPad,
  };
}

export function niceTicks(min, max, count = 10) {
  const span = max - min || 1;
  const rawStep = span / count;
  const mag = 10 ** Math.floor(Math.log10(rawStep));
  const norm = rawStep / mag;
  let step;
  if (norm < 1.5) step = mag;
  else if (norm < 3) step = 2 * mag;
  else if (norm < 7) step = 5 * mag;
  else step = 10 * mag;

  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.01; v += step) {
    ticks.push(Number(v.toPrecision(12)));
  }
  return ticks;
}
