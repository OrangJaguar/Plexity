import { describe, expect, it } from 'vitest';
import { parse } from '@/lib/tools/calculator/parser/parser';
import { compileWorkspace } from '@/lib/tools/calculator/engine/classifier';
import { createExpression } from '@/lib/tools/calculator/calculator-model';
import { computeSmartViewport } from '@/lib/tools/calculator/render/graph-viewport';

describe('computeSmartViewport', () => {
  it('fits sin(x) with tight y bounds', () => {
    const expressions = [createExpression({ raw: 'y = sin(x)', order: 0 })];
    const { compiled, scope } = compileWorkspace(expressions);
    const vp = computeSmartViewport(compiled, scope, expressions);
    expect(vp.yMax - vp.yMin).toBeLessThan(5);
    expect(vp.yMin).toBeLessThan(-0.5);
    expect(vp.yMax).toBeGreaterThan(0.5);
  });

  it('returns stable bounds for x^2', () => {
    const expressions = [createExpression({ raw: 'y = x^2', order: 0 })];
    const { compiled, scope } = compileWorkspace(expressions);
    const vp = computeSmartViewport(compiled, scope, expressions);
    expect(vp.yMin).toBeLessThanOrEqual(0);
    expect(vp.yMax).toBeGreaterThan(50);
  });
});
