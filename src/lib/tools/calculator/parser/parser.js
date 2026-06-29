import {
  assignment, binOp, call, equation, functionDef, ident, listExpr, num, point, tuple, unaryOp,
} from '@/lib/tools/calculator/parser/ast';
import { ParseError, TOKEN_TYPES, tokenize } from '@/lib/tools/calculator/parser/lexer';
import { upgradeShorthand, isBuiltinFunction } from '@/lib/tools/calculator/parser/shorthand';

export { ParseError };

class Parser {
  /** @param {import('@/lib/tools/calculator/parser/lexer.js').Token[]} tokens */
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] ?? { type: TOKEN_TYPES.EOF, value: '', pos: 0, end: 0 };
  }

  advance() {
    const t = this.peek();
    if (t.type !== TOKEN_TYPES.EOF) this.pos += 1;
    return t;
  }

  expect(type, value) {
    const t = this.peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new ParseError(`Expected ${value ?? type}`, t.pos);
    }
    return this.advance();
  }

  parse() {
    const ast = this.parseStatement();
    if (this.peek().type !== TOKEN_TYPES.EOF) {
      throw new ParseError('Unexpected token after expression', this.peek().pos);
    }
    return ast;
  }

  parseStatement() {
    const start = this.peek().pos;

    if (this.peek().type === TOKEN_TYPES.LPAREN) {
      const saved = this.pos;
      this.advance();
      const first = this.parseExpression();
      if (this.peek().type === TOKEN_TYPES.COMMA) {
        this.advance();
        const second = this.parseExpression();
        this.expect(TOKEN_TYPES.RPAREN);
        if (this.peek().type === TOKEN_TYPES.EOF) {
          return point(null, first, second, start);
        }
      }
      this.pos = saved;
    }

    if (this.peek().type === TOKEN_TYPES.IDENT) {
      const nameTok = this.peek();
      const name = nameTok.value;

      if (this.tokens[this.pos + 1]?.type === TOKEN_TYPES.LPAREN
        && this.tokens[this.pos + 2]?.type === TOKEN_TYPES.IDENT
        && this.tokens[this.pos + 3]?.type === TOKEN_TYPES.RPAREN
        && this.tokens[this.pos + 4]?.type === TOKEN_TYPES.EQ) {
        this.advance();
        this.advance();
        const param = this.advance().value;
        this.advance();
        this.advance();
        const body = this.parseExpression();
        return functionDef(name, [param], body, start);
      }

      if (this.tokens[this.pos + 1]?.type === TOKEN_TYPES.EQ) {
        this.advance();
        this.advance();
        const right = this.parseExpression();

        if (name === 'y' || (right.type === 'Call' && right.name !== undefined)) {
          return equation(ident(name, start), right, start);
        }

        if (right.type === 'Tuple' && right.items.length === 2) {
          return point(name, right.items[0], right.items[1], start);
        }

        return assignment(name, right, start);
      }
    }

    const expr = this.parseExpression();
    if (expr.type === 'BinaryOp' && (expr.op === '=' || expr.op === '==')) {
      return equation(expr.left, expr.right, start);
    }
    return expr;
  }

  parseExpression() {
    return this.parseComparison();
  }

  parseComparison() {
    let left = this.parseAddSub();
    while (this.peek().type === TOKEN_TYPES.LT || this.peek().type === TOKEN_TYPES.GT
      || (this.peek().type === TOKEN_TYPES.OP && ['<=', '>=', '==', '!='].includes(this.peek().value))) {
      const opTok = this.advance();
      const right = this.parseAddSub();
      left = binOp(opTok.value, left, right, opTok.pos);
    }
    return left;
  }

  parseAddSub() {
    let left = this.parseMulDiv();
    while (this.peek().type === TOKEN_TYPES.OP && (this.peek().value === '+' || this.peek().value === '-')) {
      const opTok = this.advance();
      const right = this.parseMulDiv();
      left = binOp(opTok.value, left, right, opTok.pos);
    }
    return left;
  }

  parseMulDiv() {
    let left = this.parsePower();
    while (this.peek().type === TOKEN_TYPES.OP && (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%')) {
      const opTok = this.advance();
      const right = this.parsePower();
      left = binOp(opTok.value, left, right, opTok.pos);
    }
    return left;
  }

  parsePower() {
    let left = this.parseUnary();
    while (this.peek().type === TOKEN_TYPES.OP && (this.peek().value === '^' || this.peek().value === '**')) {
      const opTok = this.advance();
      const right = this.parseUnary();
      left = binOp('^', left, right, opTok.pos);
    }
    return left;
  }

  parseUnary() {
    if (this.peek().type === TOKEN_TYPES.OP && (this.peek().value === '-' || this.peek().value === '+')) {
      const opTok = this.advance();
      const operand = this.parseUnary();
      return unaryOp(opTok.value, operand, opTok.pos);
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let node = this.parsePrimary();
    while (this.peek().type === TOKEN_TYPES.OP && this.peek().value === '!') {
      this.advance();
      node = call('factorial', [node], node.pos);
    }
    return node;
  }

  parsePrimary() {
    const tok = this.peek();

    if (tok.type === TOKEN_TYPES.NUMBER) {
      this.advance();
      return num(Number(tok.value), tok.pos);
    }

    if (tok.type === TOKEN_TYPES.IDENT) {
      const nameTok = this.advance();
      const name = upgradeShorthand(nameTok.value);

      if (this.peek().type === TOKEN_TYPES.LPAREN) {
        this.advance();
        const args = [];
        if (this.peek().type !== TOKEN_TYPES.RPAREN) {
          args.push(this.parseExpression());
          while (this.peek().type === TOKEN_TYPES.COMMA) {
            this.advance();
            args.push(this.parseExpression());
          }
        }
        this.expect(TOKEN_TYPES.RPAREN);
        return call(name, args, nameTok.pos);
      }

      if (isBuiltinFunction(name)) {
        const next = this.peek();
        const canTakeArg = next.type === TOKEN_TYPES.IDENT
          || next.type === TOKEN_TYPES.NUMBER
          || next.type === TOKEN_TYPES.LPAREN
          || (next.type === TOKEN_TYPES.OP && (next.value === '-' || next.value === '+'));
        if (canTakeArg) {
          const arg = this.parseUnary();
          return call(name, [arg], nameTok.pos);
        }
      }

      return ident(name, nameTok.pos);
    }

    if (tok.type === TOKEN_TYPES.LPAREN) {
      this.advance();
      const first = this.parseExpression();
      if (this.peek().type === TOKEN_TYPES.COMMA) {
        this.advance();
        const second = this.parseExpression();
        this.expect(TOKEN_TYPES.RPAREN);
        return tuple([first, second], tok.pos);
      }
      this.expect(TOKEN_TYPES.RPAREN);
      return first;
    }

    if (tok.type === TOKEN_TYPES.LBRACE) {
      this.advance();
      const items = [];
      if (this.peek().type !== TOKEN_TYPES.RBRACE) {
        items.push(this.parseExpression());
        while (this.peek().type === TOKEN_TYPES.COMMA) {
          this.advance();
          items.push(this.parseExpression());
        }
      }
      this.expect(TOKEN_TYPES.RBRACE);
      return listExpr(items, tok.pos);
    }

    throw new ParseError(`Unexpected token '${tok.value || tok.type}'`, tok.pos);
  }
}

export function parse(input) {
  const tokens = tokenize(input);
  return new Parser(tokens).parse();
}

export function tryParse(input) {
  try {
    const ast = parse(input);
    return { ok: true, ast, error: null };
  } catch (err) {
    return {
      ok: false,
      ast: null,
      error: err instanceof ParseError ? err.message : String(err),
      pos: err instanceof ParseError ? err.pos : 0,
    };
  }
}
