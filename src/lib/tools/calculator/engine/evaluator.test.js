import { describe, expect, it } from 'vitest';
import { parse } from '@/lib/tools/calculator/parser/parser';
import { createEvalContext, evaluate, tryEvaluate } from '@/lib/tools/calculator/engine/evaluator';
import { compileWorkspace } from '@/lib/tools/calculator/engine/classifier';
import { createExpression } from '@/lib/tools/calculator/calculator-model';

describe('calculator evaluator', () => {
  it('evaluates arithmetic', () => {
    expect(evaluate(parse('2+3*4'))).toBe(14);
  });

  it('evaluates trig', () => {
    const v = evaluate(parse('sin(0)'));
    expect(Math.abs(v)).toBeLessThan(1e-12);
  });

  it('evaluates powers', () => {
    expect(evaluate(parse('2^3'))).toBe(8);
  });

  it('uses pi constant', () => {
    expect(evaluate(parse('2*pi'))).toBeCloseTo(2 * Math.PI);
  });

  it('errors on undefined variable', () => {
    const r = tryEvaluate(parse('x+1'), createEvalContext());
    expect(r.ok).toBe(false);
  });

  it('evaluates with scope', () => {
    const ctx = createEvalContext({ vars: { a: 5 } });
    expect(evaluate(parse('a+2'), ctx)).toBe(7);
  });

  it('evaluates user functions', () => {
    const ast = parse('f(x)=x^2');
    const ctx = createEvalContext({
      funcs: { f: { params: ['x'], body: ast.body } },
      x: 3,
    });
    expect(evaluate(parse('f(3)'), ctx)).toBe(9);
  });

  it('factorial works for integers', () => {
    expect(evaluate(parse('5!'))).toBe(120);
  });

  it('nPr and nCr', () => {
    expect(evaluate(parse('nPr(5,2)'))).toBe(20);
    expect(evaluate(parse('nCr(5,2)'))).toBe(10);
  });

  it('division by zero errors', () => {
    expect(tryEvaluate(parse('1/0')).ok).toBe(false);
  });
});

describe('workspace scope', () => {
  it('resolves variable dependencies in order', () => {
    const expressions = [
      createExpression({ id: 'a', raw: 'a=2', order: 0 }),
      createExpression({ id: 'b', raw: 'b=a+3', order: 1 }),
    ];
    const { scope } = compileWorkspace(expressions);
    expect(scope.vars.a).toBe(2);
    expect(scope.vars.b).toBe(5);
  });
});
