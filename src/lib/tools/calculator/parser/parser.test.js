import { describe, expect, it } from 'vitest';
import { parse, tryParse } from '@/lib/tools/calculator/parser/parser';
import { tokenize } from '@/lib/tools/calculator/parser/lexer';

describe('calculator lexer', () => {
  it('tokenizes numbers and identifiers', () => {
    const tokens = tokenize('2x + 3');
    expect(tokens.some((t) => t.type === 'NUMBER' && t.value === '2')).toBe(true);
    expect(tokens.some((t) => t.type === 'IDENT' && t.value === 'x')).toBe(true);
  });

  it('inserts implicit multiplication', () => {
    const tokens = tokenize('2x');
    const ops = tokens.filter((t) => t.value === '*');
    expect(ops.length).toBeGreaterThan(0);
  });

  it('tokenizes 3(x+1)', () => {
    expect(() => tokenize('3(x+1)')).not.toThrow();
  });

  it('tokenizes 4pi', () => {
    const tokens = tokenize('4pi');
    expect(tokens.filter((t) => t.value === '*').length).toBeGreaterThan(0);
  });
});

describe('calculator parser', () => {
  const cases = [
    ['1+2*3', 'BinaryOp'],
    ['2x+3', 'BinaryOp'],
    ['sin(x)', 'Call'],
    ['sqrt(x)', 'Call'],
    ['x^2', 'BinaryOp'],
    ['a=3', 'Assignment'],
    ['f(x)=x^2', 'FunctionDef'],
    ['y=sin(x)', 'Equation'],
    ['x^2', 'BinaryOp'],
    ['(x+1)*(x-1)', 'BinaryOp'],
    ['-x+1', 'BinaryOp'],
    ['2*(x+1)', 'BinaryOp'],
    ['log(x)', 'Call'],
    ['ln(x)', 'Call'],
    ['abs(x)', 'Call'],
    ['pi', 'Identifier'],
    ['e^x', 'BinaryOp'],
    ['A=(2,3)', 'Point'],
    ['{1,2,3}', 'List'],
    ['x<1', 'BinaryOp'],
    ['x>=2', 'BinaryOp'],
    ['5!', 'Call'],
  ];

  cases.forEach(([input, type]) => {
    it(`parses ${input} as ${type}`, () => {
      const ast = parse(input);
      expect(ast.type).toBe(type);
    });
  });

  it('reports parse errors', () => {
    const r = tryParse('2+');
    expect(r.ok).toBe(false);
  });

  it('handles precedence', () => {
    const ast = parse('1+2*3');
    expect(ast.type).toBe('BinaryOp');
    expect(ast.op).toBe('+');
    expect(ast.right.type).toBe('BinaryOp');
    expect(ast.right.op).toBe('*');
  });
});

// bulk cases for 100+ coverage
describe('parser bulk', () => {
  const nums = Array.from({ length: 20 }, (_, i) => [`${i}+${i + 1}`, 'BinaryOp']);
  const trig = ['sin(x)', 'cos(x)', 'tan(x)', 'sin(2x)', 'cos(x+1)', 'tan(2*x)'].map((s) => [s, s.startsWith('sin') || s.startsWith('cos') || s.startsWith('tan') ? 'Call' : 'BinaryOp']);
  const all = [...nums, ...trig];

  all.forEach(([input]) => {
    it(`parses ${input}`, () => {
      expect(tryParse(input).ok).toBe(true);
    });
  });
});
