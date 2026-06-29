import { createEvalContext, evaluate, tryEvaluate } from '@/lib/tools/calculator/engine/evaluator';

const TOL = 1e-6;
const MAX_ITER = 80;

function evalFn(bodyAst, scope, x) {
  const ctx = createEvalContext({ ...scope, x });
  return tryEvaluate(bodyAst, ctx);
}

export function findRoots(bodyAst, scope, xMin, xMax, count = 10) {
  const roots = [];
  const n = Math.max(50, count * 20);
  let prev = null;

  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const result = evalFn(bodyAst, scope, x);
    if (!result.ok) {
      prev = null;
      continue;
    }
    const y = result.value;
    if (prev && prev.ok && Math.sign(prev.y) !== Math.sign(y) && Math.abs(y - prev.y) > TOL) {
      const root = bisection(bodyAst, scope, prev.x, x);
      if (root !== null && !roots.some((r) => Math.abs(r - root) < TOL * 10)) {
        roots.push(root);
      }
    }
    prev = { x, y, ok: true };
  }
  return roots.slice(0, count);
}

function bisection(bodyAst, scope, a, b) {
  let fa = evalFn(bodyAst, scope, a);
  let fb = evalFn(bodyAst, scope, b);
  if (!fa.ok || !fb.ok) return null;
  if (fa.value === 0) return a;
  if (fb.value === 0) return b;

  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (a + b) / 2;
    const fm = evalFn(bodyAst, scope, mid);
    if (!fm.ok) return null;
    if (Math.abs(fm.value) < TOL) return mid;
    if (Math.sign(fm.value) === Math.sign(fa.value)) {
      a = mid;
      fa = fm;
    } else {
      b = mid;
      fb = fm;
    }
  }
  return (a + b) / 2;
}

export function findIntersections(bodyA, bodyB, scope, xMin, xMax) {
  const points = [];
  const n = 200;
  let prev = null;

  for (let i = 0; i <= n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const ya = evalFn(bodyA, scope, x);
    const yb = evalFn(bodyB, scope, x);
    if (!ya.ok || !yb.ok) {
      prev = null;
      continue;
    }
    const diff = ya.value - yb.value;
    if (prev && Math.sign(prev.diff) !== Math.sign(diff)) {
      const xi = bisectionDiff(bodyA, bodyB, scope, prev.x, x);
      if (xi !== null) {
        const yr = evalFn(bodyA, scope, xi);
        if (yr.ok) points.push({ x: xi, y: yr.value });
      }
    }
    prev = { x, diff };
  }
  return points;
}

function bisectionDiff(bodyA, bodyB, scope, a, b) {
  const f = (x) => {
    const ya = evalFn(bodyA, scope, x);
    const yb = evalFn(bodyB, scope, x);
    if (!ya.ok || !yb.ok) return null;
    return ya.value - yb.value;
  };
  let fa = f(a);
  let fb = f(b);
  if (fa === null || fb === null) return null;
  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (a + b) / 2;
    const fm = f(mid);
    if (fm === null) return null;
    if (Math.abs(fm) < TOL) return mid;
    if (Math.sign(fm) === Math.sign(fa)) { a = mid; fa = fm; }
    else { b = mid; fb = fm; }
  }
  return (a + b) / 2;
}

export function findLocalExtrema(bodyAst, scope, xMin, xMax) {
  const extrema = [];
  const n = 150;
  let prev = null;

  for (let i = 1; i < n; i++) {
    const x = xMin + ((xMax - xMin) * i) / n;
    const result = evalFn(bodyAst, scope, x);
    if (!result.ok) continue;
    const y = result.value;
    if (prev) {
      const slopeBefore = y - prev.y;
      const xNext = xMin + ((xMax - xMin) * (i + 1)) / n;
      const next = evalFn(bodyAst, scope, xNext);
      if (next.ok) {
        const slopeAfter = next.value - y;
        if (slopeBefore > 0 && slopeAfter < 0) extrema.push({ x, y, type: 'max' });
        if (slopeBefore < 0 && slopeAfter > 0) extrema.push({ x, y, type: 'min' });
      }
    }
    prev = { x, y };
  }
  return extrema;
}
