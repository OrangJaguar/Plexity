import { describe, expect, it } from 'vitest';
import { parse } from '@/lib/tools/calculator/parser/parser';
import { createEvalContext, evaluate } from '@/lib/tools/calculator/engine/evaluator';
import { sampleFunction } from '@/lib/tools/calculator/engine/sampler-2d';
import { findRoots, findIntersections } from '@/lib/tools/calculator/engine/analysis';

const scope = { vars: {}, funcs: {}, angleMode: 'RAD' };

describe('sampler-2d', () => {
  it('samples sin(x)', () => {
    const ast = parse('sin(x)');
    const segs = sampleFunction(ast, scope, -Math.PI, Math.PI, 400, 300, -2, 2);
    expect(segs.length).toBeGreaterThan(0);
    expect(segs[0].length).toBeGreaterThan(2);
  });

  it('splits 1/x discontinuity', () => {
    const ast = parse('1/x');
    const segs = sampleFunction(ast, scope, -2, 2, 400, 300, -10, 10);
    expect(segs.length).toBeGreaterThan(1);
  });

  it('samples abs(x)', () => {
    const ast = parse('abs(x)');
    const segs = sampleFunction(ast, scope, -2, 2, 400, 300, -2, 2);
    const ys = segs.flat().map((p) => p.y);
    expect(Math.min(...ys)).toBeCloseTo(0, 1);
  });
});

describe('analysis', () => {
  it('finds roots of x^2-4', () => {
    const ast = parse('x^2-4');
    const roots = findRoots(ast, scope, -5, 5);
    expect(roots.some((r) => Math.abs(r - 2) < 0.01)).toBe(true);
    expect(roots.some((r) => Math.abs(r + 2) < 0.01)).toBe(true);
  });

  it('finds intersection of x and x^2', () => {
    const a = parse('x');
    const b = parse('x^2');
    const pts = findIntersections(a, b, scope, -2, 2);
    expect(pts.length).toBeGreaterThan(0);
    expect(pts.some((p) => Math.abs(p.x) < 0.05 && Math.abs(p.y) < 0.05)).toBe(true);
    expect(pts.some((p) => Math.abs(p.x - 1) < 0.05)).toBe(true);
  });
});
