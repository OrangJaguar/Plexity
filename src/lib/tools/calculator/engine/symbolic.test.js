import { describe, expect, it } from 'vitest';
import { parse } from '@/lib/tools/calculator/parser/parser';
import { runCasOperation, derivative, simplifyPolynomial } from '@/lib/tools/calculator/engine/symbolic';

describe('symbolic', () => {
  it('simplifies numeric expressions', () => {
    const ast = parse('2+3');
    const s = simplifyPolynomial(ast);
    expect(s.type).toBe('Number');
    expect(s.value).toBe(5);
  });

  it('derivative of x^2', () => {
    const ast = parse('x^2');
    const d = derivative(ast, 'x');
    expect(d).not.toBeNull();
  });

  it('runCasOperation simplify', () => {
    const r = runCasOperation('simplify', '2+3');
    expect(r.ok).toBe(true);
  });

  it('runCasOperation derivative', () => {
    const r = runCasOperation('derivative', 'x^3');
    expect(r.ok).toBe(true);
  });
});
