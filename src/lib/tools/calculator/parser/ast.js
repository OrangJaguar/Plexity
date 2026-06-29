/** @typedef {'Number'|'Identifier'|'BinaryOp'|'UnaryOp'|'Call'|'Assignment'|'FunctionDef'|'Equation'|'Point'|'List'|'Fraction'|'Power'|'Sqrt'|'Integral'|'Summation'|'Tuple'} AstType */

/**
 * @typedef {object} AstNode
 * @property {AstType} type
 * @property {number} [pos]
 * @property {number} [end]
 */

export function num(value, pos = 0) {
  return { type: 'Number', value: Number(value), pos };
}

export function ident(name, pos = 0) {
  return { type: 'Identifier', name, pos };
}

export function binOp(op, left, right, pos = 0) {
  return { type: 'BinaryOp', op, left, right, pos };
}

export function unaryOp(op, operand, pos = 0) {
  return { type: 'UnaryOp', op, operand, pos };
}

export function call(name, args, pos = 0) {
  return { type: 'Call', name, args, pos };
}

export function assignment(name, value, pos = 0) {
  return { type: 'Assignment', name, value, pos };
}

export function functionDef(name, params, body, pos = 0) {
  return { type: 'FunctionDef', name, params, body, pos };
}

export function equation(left, right, pos = 0) {
  return { type: 'Equation', left, right, pos };
}

export function point(name, x, y, pos = 0) {
  return { type: 'Point', name, x, y, pos };
}

export function listExpr(items, pos = 0) {
  return { type: 'List', items, pos };
}

export function fraction(numExpr, denExpr, pos = 0) {
  return { type: 'Fraction', numerator: numExpr, denominator: denExpr, pos };
}

export function power(base, exponent, pos = 0) {
  return { type: 'Power', base, exponent, pos };
}

export function sqrtExpr(operand, pos = 0) {
  return { type: 'Sqrt', operand, pos };
}

export function integralExpr(integrand, variable, lower, upper, pos = 0) {
  return { type: 'Integral', integrand, variable, lower, upper, pos };
}

export function summationExpr(body, variable, lower, upper, pos = 0) {
  return { type: 'Summation', body, variable, lower, upper, pos };
}

export function tuple(items, pos = 0) {
  return { type: 'Tuple', items, pos };
}

export function cloneAst(node) {
  if (!node || typeof node !== 'object') return node;
  return JSON.parse(JSON.stringify(node));
}

export function walkAst(node, visitor) {
  if (!node) return;
  visitor(node);
  switch (node.type) {
    case 'BinaryOp':
      walkAst(node.left, visitor);
      walkAst(node.right, visitor);
      break;
    case 'UnaryOp':
      walkAst(node.operand, visitor);
      break;
    case 'Call':
      node.args.forEach((a) => walkAst(a, visitor));
      break;
    case 'Assignment':
      walkAst(node.value, visitor);
      break;
    case 'FunctionDef':
      walkAst(node.body, visitor);
      break;
    case 'Equation':
      walkAst(node.left, visitor);
      walkAst(node.right, visitor);
      break;
    case 'Point':
      walkAst(node.x, visitor);
      walkAst(node.y, visitor);
      break;
    case 'List':
    case 'Tuple':
      node.items.forEach((i) => walkAst(i, visitor));
      break;
    case 'Fraction':
      walkAst(node.numerator, visitor);
      walkAst(node.denominator, visitor);
      break;
    case 'Power':
      walkAst(node.base, visitor);
      walkAst(node.exponent, visitor);
      break;
    case 'Sqrt':
      walkAst(node.operand, visitor);
      break;
    case 'Integral':
    case 'Summation':
      walkAst(node.body, visitor);
      if (node.lower) walkAst(node.lower, visitor);
      if (node.upper) walkAst(node.upper, visitor);
      break;
    default:
      break;
  }
}

export function collectIdentifiers(node, exclude = new Set()) {
  const names = new Set();
  walkAst(node, (n) => {
    if (n.type === 'Identifier' && !exclude.has(n.name)) {
      names.add(n.name);
    }
  });
  return [...names];
}
