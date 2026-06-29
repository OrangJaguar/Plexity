import { BUILTIN_CONSTANTS } from '@/lib/tools/calculator/calculator-constants';
import { walkAst } from '@/lib/tools/calculator/parser/ast';

export class EvalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EvalError';
  }
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new EvalError('Factorial requires a non-negative integer');
  if (n > 170) throw new EvalError('Factorial too large');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function nPr(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || n < 0 || r < 0 || r > n) {
    throw new EvalError('Invalid nPr arguments');
  }
  return factorial(n) / factorial(n - r);
}

function nCr(n, r) {
  return nPr(n, r) / factorial(r);
}

function toRadians(x, angleMode) {
  return angleMode === 'DEG' ? (x * Math.PI) / 180 : x;
}

function fromTrigInput(x, angleMode) {
  return angleMode === 'DEG' ? (x * Math.PI) / 180 : x;
}

/**
 * @typedef {object} EvalContext
 * @property {Record<string, number>} vars
 * @property {Record<string, { params: string[], body: object }>} funcs
 * @property {'RAD'|'DEG'} angleMode
 * @property {number} [x]
 */

export function createEvalContext(overrides = {}) {
  return {
    vars: { ...overrides.vars },
    funcs: { ...overrides.funcs },
    angleMode: overrides.angleMode === 'DEG' ? 'DEG' : 'RAD',
    x: overrides.x,
  };
}

export function evaluate(ast, ctx = createEvalContext()) {
  if (!ast) throw new EvalError('Empty expression');
  return evalNode(ast, ctx);
}

function evalNode(node, ctx) {
  switch (node.type) {
    case 'Number':
      return node.value;
    case 'Identifier': {
      if (node.name === 'x' && ctx.x !== undefined) return ctx.x;
      if (node.name in BUILTIN_CONSTANTS) return BUILTIN_CONSTANTS[node.name];
      if (node.name in ctx.vars) return ctx.vars[node.name];
      throw new EvalError(`Undefined variable: ${node.name}`);
    }
    case 'UnaryOp': {
      const v = evalNode(node.operand, ctx);
      if (node.op === '-') return -v;
      if (node.op === '+') return +v;
      throw new EvalError(`Unknown unary operator: ${node.op}`);
    }
    case 'BinaryOp': {
      const l = evalNode(node.left, ctx);
      const r = evalNode(node.right, ctx);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) throw new EvalError('Division by zero');
          return l / r;
        case '%': return l % r;
        case '^': return l ** r;
        case '<': return l < r ? 1 : 0;
        case '>': return l > r ? 1 : 0;
        case '<=': return l <= r ? 1 : 0;
        case '>=': return l >= r ? 1 : 0;
        case '==': return l === r ? 1 : 0;
        case '!=': return l !== r ? 1 : 0;
        default: throw new EvalError(`Unknown operator: ${node.op}`);
      }
    }
    case 'Call':
      return evalCall(node.name, node.args, ctx, node.pos);
    case 'Fraction': {
      const den = evalNode(node.denominator, ctx);
      if (den === 0) throw new EvalError('Division by zero');
      return evalNode(node.numerator, ctx) / den;
    }
    case 'Power':
      return evalNode(node.base, ctx) ** evalNode(node.exponent, ctx);
    case 'Sqrt': {
      const v = evalNode(node.operand, ctx);
      if (v < 0) throw new EvalError('Square root of negative number');
      return Math.sqrt(v);
    }
    case 'List':
      return node.items.map((i) => evalNode(i, ctx));
    case 'Tuple':
      return node.items.map((i) => evalNode(i, ctx));
    default:
      throw new EvalError(`Cannot evaluate node type: ${node.type}`);
  }
}

function evalCall(name, args, ctx) {
  const evaluatedArgs = args.map((a) => evalNode(a, ctx));

  if (name in ctx.funcs) {
    const fn = ctx.funcs[name];
    if (evaluatedArgs.length !== fn.params.length) {
      throw new EvalError(`Function ${name} expects ${fn.params.length} arguments`);
    }
    const child = createEvalContext({
      vars: { ...ctx.vars },
      funcs: ctx.funcs,
      angleMode: ctx.angleMode,
      x: ctx.x,
    });
    fn.params.forEach((p, i) => { child.vars[p] = evaluatedArgs[i]; });
    return evaluate(fn.body, child);
  }

  switch (name) {
    case 'sin': return Math.sin(toRadians(evaluatedArgs[0], ctx.angleMode));
    case 'cos': return Math.cos(toRadians(evaluatedArgs[0], ctx.angleMode));
    case 'tan': return Math.tan(toRadians(evaluatedArgs[0], ctx.angleMode));
    case 'asin': return ctx.angleMode === 'DEG' ? (Math.asin(evaluatedArgs[0]) * 180) / Math.PI : Math.asin(evaluatedArgs[0]);
    case 'acos': return ctx.angleMode === 'DEG' ? (Math.acos(evaluatedArgs[0]) * 180) / Math.PI : Math.acos(evaluatedArgs[0]);
    case 'atan': return ctx.angleMode === 'DEG' ? (Math.atan(evaluatedArgs[0]) * 180) / Math.PI : Math.atan(evaluatedArgs[0]);
    case 'sqrt': {
      if (evaluatedArgs[0] < 0) throw new EvalError('Square root of negative number');
      return Math.sqrt(evaluatedArgs[0]);
    }
    case 'abs': return Math.abs(evaluatedArgs[0]);
    case 'log': return Math.log10(evaluatedArgs[0]);
    case 'ln': return Math.log(evaluatedArgs[0]);
    case 'exp': return Math.exp(evaluatedArgs[0]);
    case 'floor': return Math.floor(evaluatedArgs[0]);
    case 'ceil': return Math.ceil(evaluatedArgs[0]);
    case 'round': return Math.round(evaluatedArgs[0]);
    case 'min': return Math.min(...evaluatedArgs);
    case 'max': return Math.max(...evaluatedArgs);
    case 'factorial': return factorial(evaluatedArgs[0]);
    case 'nPr': return nPr(evaluatedArgs[0], evaluatedArgs[1]);
    case 'nCr': return nCr(evaluatedArgs[0], evaluatedArgs[1]);
    default:
      throw new EvalError(`Unknown function: ${name}`);
  }
}

export function numericDerivative(ast, ctx, variable = 'x', h = 1e-5) {
  const x0 = variable === 'x' ? (ctx.x ?? 0) : (ctx.vars[variable] ?? 0);
  const f = (xv) => {
    const c = createEvalContext({ ...ctx, x: variable === 'x' ? xv : ctx.x, vars: { ...ctx.vars } });
    if (variable !== 'x') c.vars[variable] = xv;
    return evaluate(ast, c);
  };
  return (f(x0 + h) - f(x0 - h)) / (2 * h);
}

export function tryEvaluate(ast, ctx) {
  try {
    return { ok: true, value: evaluate(ast, ctx), error: null };
  } catch (err) {
    return { ok: false, value: null, error: err instanceof EvalError ? err.message : String(err) };
  }
}

export function extractDefinitions(ast) {
  if (!ast) return null;
  if (ast.type === 'Assignment') {
    return { kind: 'variable', name: ast.name, value: ast.value };
  }
  if (ast.type === 'FunctionDef') {
    return { kind: 'function', name: ast.name, params: ast.params, body: ast.body };
  }
  if (ast.type === 'Point') {
    return { kind: 'point', name: ast.name, x: ast.x, y: ast.y };
  }
  if (ast.type === 'Equation') {
    return { kind: 'equation', left: ast.left, right: ast.right };
  }
  return { kind: 'expression', expr: ast };
}

export function getGraphableBody(ast) {
  const def = extractDefinitions(ast);
  if (!def) return null;
  if (def.kind === 'function') return { body: def.body, param: def.params[0] || 'x' };
  if (def.kind === 'equation') {
    if (def.left.type === 'Identifier' && (def.left.name === 'y' || def.left.name === 'f')) {
      return { body: def.right, param: 'x' };
    }
    if (def.right.type === 'Identifier' && def.right.name === 'y') {
      return { body: def.left, param: 'x' };
    }
  }
  if (def.kind === 'expression') {
    return { body: def.expr, param: 'x' };
  }
  return null;
}

export function astUsesVariable(ast, name = 'x') {
  let found = false;
  walkAst(ast, (n) => {
    if (n.type === 'Identifier' && n.name === name) found = true;
  });
  return found;
}
