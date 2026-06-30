import { createEvalContext, evaluate, tryEvaluate } from '@/lib/tools/calculator/engine/evaluator';

const MAX_DEPTH = 14;
const MIN_PIXEL_WIDTH = 2;

/**
 * @typedef {{ x: number, y: number }[]} SampleSegment
 * @typedef {{ segments: SampleSegment[], color?: string, id: string }} SampledCurve
 */

export function sampleFunction(bodyAst, scope, xMin, xMax, pixelWidth, pixelHeight, yMin, yMax, independent = 'x') {
  if (independent === 'y') {
    return sampleFunctionByY(bodyAst, scope, xMin, xMax, pixelWidth, pixelHeight, yMin, yMax);
  }

  const segments = [];
  const n = Math.max(64, Math.min(2048, Math.ceil(pixelWidth * 2)));
  let current = [];

  const evalAt = (x) => {
    const ctx = createEvalContext({
      vars: scope.vars,
      funcs: scope.funcs,
      angleMode: scope.angleMode,
      x,
    });
    return tryEvaluate(bodyAst, ctx);
  };

  const yRange = yMax - yMin;
  const jumpThreshold = yRange * 0.75;

  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const result = evalAt(x);

    if (!result.ok || !Number.isFinite(result.value)) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }

    const y = result.value;

    if (current.length > 0) {
      const prev = current[current.length - 1];
      if (Math.abs(y - prev.y) > jumpThreshold) {
        if (current.length > 1) segments.push(current);
        current = [];
      }
    }

    if (y < yMin - yRange || y > yMax + yRange) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }

    current.push({ x, y });

    if (current.length >= 2) {
      refineSegment(current, current.length - 2, bodyAst, scope, xMin, xMax, yMin, yMax, 0);
    }
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function sampleFunctionByY(bodyAst, scope, xMin, xMax, pixelWidth, pixelHeight, yMin, yMax) {
  const segments = [];
  const n = Math.max(64, Math.min(2048, Math.ceil(pixelHeight * 2)));
  let current = [];

  const evalAt = (y) => {
    const ctx = createEvalContext({
      vars: scope.vars,
      funcs: scope.funcs,
      angleMode: scope.angleMode,
      y,
    });
    return tryEvaluate(bodyAst, ctx);
  };

  const xRange = xMax - xMin;
  const jumpThreshold = xRange * 0.75;

  for (let i = 0; i <= n; i += 1) {
    const y = yMin + ((yMax - yMin) * i) / n;
    const result = evalAt(y);

    if (!result.ok || !Number.isFinite(result.value)) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }

    const x = result.value;

    if (current.length > 0) {
      const prev = current[current.length - 1];
      if (Math.abs(x - prev.x) > jumpThreshold) {
        if (current.length > 1) segments.push(current);
        current = [];
      }
    }

    if (x < xMin - xRange || x > xMax + xRange) {
      if (current.length > 1) segments.push(current);
      current = [];
      continue;
    }

    current.push({ x, y });
  }

  if (current.length > 1) segments.push(current);
  return segments;
}

function refineSegment(points, idx, bodyAst, scope, xMin, xMax, yMin, yMax, depth) {
  if (depth >= MAX_DEPTH) return;
  const a = points[idx];
  const b = points[idx + 1];
  const midX = (a.x + b.x) / 2;

  const ctx = createEvalContext({ vars: scope.vars, funcs: scope.funcs, angleMode: scope.angleMode, x: midX });
  const midResult = tryEvaluate(bodyAst, ctx);
  if (!midResult.ok || !Number.isFinite(midResult.value)) return;

  const expectedY = (a.y + b.y) / 2;
  const actualY = midResult.value;
  const yRange = yMax - yMin;
  const tolerance = Math.max(0.01, yRange * 0.002);

  if (Math.abs(actualY - expectedY) > tolerance) {
    points.splice(idx + 1, 0, { x: midX, y: actualY });
    refineSegment(points, idx, bodyAst, scope, xMin, xMax, yMin, yMax, depth + 1);
    refineSegment(points, idx + 1, bodyAst, scope, xMin, xMax, yMin, yMax, depth + 1);
  }
}

export function sampleAllCurves(compiled, scope, viewport, pixelWidth, pixelHeight, expressions) {
  const visible = new Set(expressions.filter((e) => e.visible).map((e) => e.id));
  /** @type {SampledCurve[]} */
  const curves = [];

  for (const item of compiled) {
    if (!item.graphable || item.error || !visible.has(item.id)) continue;
    const expr = expressions.find((e) => e.id === item.id);
    const segments = sampleFunction(
      item.graphable.body,
      scope,
      viewport.xMin,
      viewport.xMax,
      pixelWidth,
      pixelHeight,
      viewport.yMin,
      viewport.yMax,
      item.graphable.independent || 'x',
    );
    curves.push({ id: item.id, segments, color: expr?.color });
  }

  return curves;
}

export function nearestPointOnCurves(curves, x, y, threshold = 0.5) {
  let best = null;
  let bestDist = Infinity;

  for (const curve of curves) {
    for (const seg of curve.segments) {
      for (const pt of seg) {
        const dx = pt.x - x;
        const dy = pt.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          best = { ...pt, curveId: curve.id, color: curve.color };
        }
      }
    }
  }

  return bestDist <= threshold ? best : null;
}

export function evaluateAtX(bodyAst, scope, x) {
  const ctx = createEvalContext({ vars: scope.vars, funcs: scope.funcs, angleMode: scope.angleMode, x });
  return tryEvaluate(bodyAst, ctx);
}
