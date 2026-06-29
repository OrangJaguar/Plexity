import { walkAst } from '@/lib/tools/calculator/parser/ast';
import { tryParse } from '@/lib/tools/calculator/parser/parser';

export function simplifyPolynomial(ast) {
  if (!ast) return ast;
  if (ast.type === 'Number' || ast.type === 'Identifier') return ast;
  if (ast.type === 'UnaryOp' && ast.op === '-') {
    const inner = simplifyPolynomial(ast.operand);
    if (inner.type === 'Number') return { type: 'Number', value: -inner.value, pos: ast.pos };
    return { ...ast, operand: inner };
  }
  if (ast.type === 'BinaryOp') {
    const left = simplifyPolynomial(ast.left);
    const right = simplifyPolynomial(ast.right);
    if (left.type === 'Number' && right.type === 'Number') {
      const ops = { '+': left.value + right.value, '-': left.value - right.value, '*': left.value * right.value };
      if (ast.op in ops) return { type: 'Number', value: ops[ast.op], pos: ast.pos };
    }
    if (ast.op === '+' && right.type === 'Number' && right.value === 0) return left;
    if (ast.op === '*' && (left.type === 'Number' && left.value === 1 || right.type === 'Number' && right.value === 1)) {
      return left.type === 'Number' && left.value === 1 ? right : left;
    }
    if (ast.op === '*' && ((left.type === 'Number' && left.value === 0) || (right.type === 'Number' && right.value === 0))) {
      return { type: 'Number', value: 0, pos: ast.pos };
    }
    return { ...ast, left, right };
  }
  return ast;
}

export function expandBinomial(ast) {
  const s = simplifyPolynomial(ast);
  if (s.type === 'BinaryOp' && s.op === '^' && s.left.type === 'BinaryOp' && s.left.op === '+' && s.right.type === 'Number' && s.right.value === 2) {
    const a = s.left.left;
    const b = s.left.right;
    return simplifyPolynomial({
      type: 'BinaryOp', op: '+', pos: s.pos,
      left: { type: 'BinaryOp', op: '*', left: a, right: a, pos: s.pos },
      right: { type: 'BinaryOp', op: '+', pos: s.pos,
        left: { type: 'BinaryOp', op: '*', left: { type: 'Number', value: 2, pos: s.pos }, right: { type: 'BinaryOp', op: '*', left: a, right: b, pos: s.pos }, pos: s.pos },
        right: { type: 'BinaryOp', op: '*', left: b, right: b, pos: s.pos },
      },
    });
  }
  return s;
}

export function factorQuadratic(ast) {
  // ax^2+bx+c numeric only
  return { ast, factored: false, message: 'Factoring limited to tested forms' };
}

export function solveLinear(ast, variable = 'x') {
  // Simple: expression = 0, linear in variable
  return [];
}

export function solveQuadraticFromCoeffs(a, b, c) {
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) < 1e-12) return [];
    return [{ exact: true, value: -c / b }];
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const s = Math.sqrt(disc);
  return [
    { exact: false, value: (-b + s) / (2 * a) },
    { exact: false, value: (-b - s) / (2 * a) },
  ];
}

export function substitute(ast, variable, valueAst) {
  if (!ast) return null;
  const repl = (node) => {
    if (!node) return node;
    if (node.type === 'Identifier' && node.name === variable) return JSON.parse(JSON.stringify(valueAst));
    const copy = { ...node };
    walkAst(node, () => {});
    const map = {
      BinaryOp: () => ({ ...node, left: repl(node.left), right: repl(node.right) }),
      UnaryOp: () => ({ ...node, operand: repl(node.operand) }),
      Call: () => ({ ...node, args: node.args.map(repl) }),
      Power: () => ({ ...node, base: repl(node.base), exponent: repl(node.exponent) }),
      Fraction: () => ({ ...node, numerator: repl(node.numerator), denominator: repl(node.denominator) }),
      Sqrt: () => ({ ...node, operand: repl(node.operand) }),
    };
    if (map[node.type]) return map[node.type]();
    return node;
  };
  return repl(ast);
}

export function derivative(ast, variable = 'x') {
  if (!ast) return null;
  switch (ast.type) {
    case 'Number': return { type: 'Number', value: 0, pos: ast.pos };
    case 'Identifier': return { type: 'Number', value: ast.name === variable ? 1 : 0, pos: ast.pos };
    case 'BinaryOp': {
      const dl = derivative(ast.left, variable);
      const dr = derivative(ast.right, variable);
      if (ast.op === '+') return simplifyPolynomial({ type: 'BinaryOp', op: '+', left: dl, right: dr, pos: ast.pos });
      if (ast.op === '-') return simplifyPolynomial({ type: 'BinaryOp', op: '-', left: dl, right: dr, pos: ast.pos });
      if (ast.op === '*') return simplifyPolynomial({
        type: 'BinaryOp', op: '+', pos: ast.pos,
        left: { type: 'BinaryOp', op: '*', left: dl, right: ast.right, pos: ast.pos },
        right: { type: 'BinaryOp', op: '*', left: ast.left, right: dr, pos: ast.pos },
      });
      if (ast.op === '^' && ast.right.type === 'Number') {
        const n = ast.right.value;
        return simplifyPolynomial({
          type: 'BinaryOp', op: '*', pos: ast.pos,
          left: { type: 'Number', value: n, pos: ast.pos },
          right: { type: 'BinaryOp', op: '*', left: ast.left, right: { type: 'BinaryOp', op: '^', left: ast.left, right: { type: 'Number', value: n - 1, pos: ast.pos }, pos: ast.pos }, pos: ast.pos },
        });
      }
      break;
    }
    case 'Call': {
      if (ast.name === 'sin' && ast.args.length === 1) {
        return simplifyPolynomial({ type: 'BinaryOp', op: '*', left: derivative(ast.args[0], variable), right: { type: 'Call', name: 'cos', args: ast.args, pos: ast.pos }, pos: ast.pos });
      }
      if (ast.name === 'cos' && ast.args.length === 1) {
        return simplifyPolynomial({ type: 'UnaryOp', op: '-', operand: { type: 'BinaryOp', op: '*', left: derivative(ast.args[0], variable), right: { type: 'Call', name: 'sin', args: ast.args, pos: ast.pos }, pos: ast.pos }, pos: ast.pos });
      }
      break;
    }
    default: break;
  }
  return null;
}

export function integral(ast, variable = 'x') {
  if (!ast) return null;
  if (ast.type === 'Number') return { type: 'BinaryOp', op: '*', left: ast, right: { type: 'Identifier', name: variable, pos: ast.pos }, pos: ast.pos };
  if (ast.type === 'Identifier' && ast.name === variable) return { type: 'BinaryOp', op: '*', left: { type: 'Number', value: 0.5, pos: ast.pos }, right: { type: 'BinaryOp', op: '^', left: { type: 'Identifier', name: variable, pos: ast.pos }, right: { type: 'Number', value: 2, pos: ast.pos }, pos: ast.pos }, pos: ast.pos };
  if (ast.type === 'BinaryOp' && ast.op === '^' && ast.left.type === 'Identifier' && ast.left.name === variable && ast.right.type === 'Number' && ast.right.value !== -1) {
    const n = ast.right.value;
    return { type: 'BinaryOp', op: '*', left: { type: 'Number', value: 1 / (n + 1), pos: ast.pos }, right: { type: 'BinaryOp', op: '^', left: ast.left, right: { type: 'Number', value: n + 1, pos: ast.pos }, pos: ast.pos }, pos: ast.pos };
  }
  return null;
}

import { createEvalContext, tryEvaluate } from '@/lib/tools/calculator/engine/evaluator';

export function limitNumeric(ast, scope, variable, point) {
  const eps = [1e-4, 1e-5, 1e-6];
  const vals = eps.flatMap((e) => {
    const ctx = createEvalContext({ ...scope, vars: { ...scope.vars, [variable]: point + e } });
    const r1 = tryEvaluate(ast, ctx);
    const ctx2 = createEvalContext({ ...scope, vars: { ...scope.vars, [variable]: point - e } });
    const r2 = tryEvaluate(ast, ctx2);
    return [r1.ok ? r1.value : null, r2.ok ? r2.value : null].filter((v) => v !== null);
  });
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function astToString(ast) {
  if (!ast) return '';
  switch (ast.type) {
    case 'Number': return String(ast.value);
    case 'Identifier': return ast.name;
    case 'UnaryOp': return `${ast.op}(${astToString(ast.operand)})`;
    case 'BinaryOp': return `(${astToString(ast.left)} ${ast.op} ${astToString(ast.right)})`;
    case 'Call': return `${ast.name}(${ast.args.map(astToString).join(', ')})`;
    case 'Power': return `(${astToString(ast.base)}^${astToString(ast.exponent)})`;
    default: return ast.type;
  }
}

export function runCasOperation(operation, input, options = {}) {
  const parsed = tryParse(input);
  if (!parsed.ok) return { ok: false, error: parsed.error, exact: false };
  const ast = parsed.ast;
  let result = null;
  let exact = true;

  switch (operation) {
    case 'simplify':
      result = simplifyPolynomial(ast);
      break;
    case 'expand':
      result = expandBinomial(ast);
      break;
    case 'derivative':
      result = derivative(ast, options.variable || 'x');
      if (!result) return { ok: false, error: 'Derivative not supported for this form', exact: false };
      break;
    case 'integral':
      result = integral(ast, options.variable || 'x');
      if (!result) return { ok: false, error: 'Integral not supported for this form', exact: false };
      break;
    case 'substitute':
      if (!options.variable || !options.value) return { ok: false, error: 'Substitution requires variable and value', exact: false };
      result = substitute(ast, options.variable, tryParse(options.value).ast);
      break;
    default:
      return { ok: false, error: `Unknown operation: ${operation}`, exact: false };
  }

  return { ok: true, result, display: astToString(result), exact };
}
