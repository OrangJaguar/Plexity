import { findIntersections, findRoots } from '@/lib/tools/calculator/engine/analysis';
import { evaluateAtX } from '@/lib/tools/calculator/engine/sampler-2d';

const TOL = 1e-4;

function near(a, b) {
  return Math.abs(a - b) < TOL;
}

function dedupePoints(points) {
  const out = [];
  for (const p of points) {
    if (!out.some((q) => near(q.x, p.x) && near(q.y, p.y))) out.push(p);
  }
  return out;
}

export function computeFeaturePoints(compiled, scope, expressions, viewport) {
  const visible = new Set(expressions.filter((e) => e.visible).map((e) => e.id));
  const graphables = compiled.filter((c) => c.graphable && !c.error && visible.has(c.id));
  const { xMin, xMax, yMin, yMax } = viewport;
  const features = [];

  for (const item of graphables) {
    const color = expressions.find((e) => e.id === item.id)?.color || '#94a3b8';

    const roots = findRoots(item.graphable.body, scope, xMin, xMax, 24);
    roots.forEach((x) => {
      if (x >= xMin - TOL && x <= xMax + TOL) {
        features.push({ x, y: 0, type: 'root', curveId: item.id, color });
      }
    });

    if (xMin <= 0 && xMax >= 0) {
      const y0 = evaluateAtX(item.graphable.body, scope, 0);
      if (y0.ok && Number.isFinite(y0.value) && y0.value >= yMin - TOL && y0.value <= yMax + TOL) {
        features.push({ x: 0, y: y0.value, type: 'y-intercept', curveId: item.id, color });
      }
    }
  }

  for (let i = 0; i < graphables.length; i++) {
    for (let j = i + 1; j < graphables.length; j++) {
      const pts = findIntersections(
        graphables[i].graphable.body,
        graphables[j].graphable.body,
        scope,
        xMin,
        xMax,
      );
      const color = expressions.find((e) => e.id === graphables[i].id)?.color || '#a855f7';
      pts.forEach((p) => {
        if (p.x >= xMin - TOL && p.x <= xMax + TOL && p.y >= yMin - TOL && p.y <= yMax + TOL) {
          features.push({
            x: p.x,
            y: p.y,
            type: 'intersection',
            curveIds: [graphables[i].id, graphables[j].id],
            color,
          });
        }
      });
    }
  }

  return dedupePoints(features);
}
