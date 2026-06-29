import { BUILTIN_FUNCTIONS } from '@/lib/tools/calculator/calculator-constants';

export const TOKEN_TYPES = {
  NUMBER: 'NUMBER',
  IDENT: 'IDENT',
  OP: 'OP',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  COMMA: 'COMMA',
  EQ: 'EQ',
  LT: 'LT',
  GT: 'GT',
  EOF: 'EOF',
};

const TWO_CHAR_OPS = new Set(['<=', '>=', '==', '!=', '**']);

/**
 * @typedef {{ type: string, value: string, pos: number, end: number }} Token
 */

export function tokenize(input) {
  const src = String(input || '').trim();
  /** @type {Token[]} */
  const tokens = [];
  let i = 0;

  const peek = () => src[i] ?? '';
  const advance = () => src[i++];

  while (i < src.length) {
    const start = i;
    const ch = peek();

    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1]))) {
      let num = '';
      while (i < src.length && (/\d/.test(src[i]) || src[i] === '.')) {
        num += advance();
      }
      if (i < src.length && (src[i] === 'e' || src[i] === 'E')) {
        num += advance();
        if (src[i] === '+' || src[i] === '-') num += advance();
        while (i < src.length && /\d/.test(src[i])) num += advance();
      }
      tokens.push({ type: TOKEN_TYPES.NUMBER, value: num, pos: start, end: i });
      continue;
    }

    if (/[a-zA-Z_αβγδεζηθικλμνξοπρστυφχψωπ]/.test(ch)) {
      let name = '';
      while (i < src.length && /[a-zA-Z0-9_αβγδεζηθικλμνξοπρστυφχψωπ]/.test(src[i])) {
        name += advance();
      }
      tokens.push({ type: TOKEN_TYPES.IDENT, value: name, pos: start, end: i });
      continue;
    }

    if (ch === '(') {
      advance();
      tokens.push({ type: TOKEN_TYPES.LPAREN, value: '(', pos: start, end: i });
      continue;
    }
    if (ch === ')') {
      advance();
      tokens.push({ type: TOKEN_TYPES.RPAREN, value: ')', pos: start, end: i });
      continue;
    }
    if (ch === '{') {
      advance();
      tokens.push({ type: TOKEN_TYPES.LBRACE, value: '{', pos: start, end: i });
      continue;
    }
    if (ch === '}') {
      advance();
      tokens.push({ type: TOKEN_TYPES.RBRACE, value: '}', pos: start, end: i });
      continue;
    }
    if (ch === ',') {
      advance();
      tokens.push({ type: TOKEN_TYPES.COMMA, value: ',', pos: start, end: i });
      continue;
    }
    if (ch === '=') {
      advance();
      tokens.push({ type: TOKEN_TYPES.EQ, value: '=', pos: start, end: i });
      continue;
    }
    if (ch === '<') {
      const next = src[i + 1];
      if (next === '=') {
        i += 2;
        tokens.push({ type: TOKEN_TYPES.OP, value: '<=', pos: start, end: i });
      } else {
        advance();
        tokens.push({ type: TOKEN_TYPES.LT, value: '<', pos: start, end: i });
      }
      continue;
    }
    if (ch === '>') {
      const next = src[i + 1];
      if (next === '=') {
        i += 2;
        tokens.push({ type: TOKEN_TYPES.OP, value: '>=', pos: start, end: i });
      } else {
        advance();
        tokens.push({ type: TOKEN_TYPES.GT, value: '>', pos: start, end: i });
      }
      continue;
    }

    const two = src.slice(i, i + 2);
    if (TWO_CHAR_OPS.has(two)) {
      i += 2;
      tokens.push({ type: TOKEN_TYPES.OP, value: two, pos: start, end: i });
      continue;
    }

    if ('+-*/^%!'.includes(ch)) {
      advance();
      tokens.push({ type: TOKEN_TYPES.OP, value: ch, pos: start, end: i });
      continue;
    }

    throw new ParseError(`Unexpected character '${ch}'`, start);
  }

  tokens.push({ type: TOKEN_TYPES.EOF, value: '', pos: i, end: i });
  return insertImplicitMultiplication(tokens);
}

function needsImplicitMulBefore(token) {
  if (!token) return false;
  return token.type === TOKEN_TYPES.IDENT
    || token.type === TOKEN_TYPES.NUMBER
    || token.type === TOKEN_TYPES.RPAREN
    || token.type === TOKEN_TYPES.RBRACE;
}

function needsImplicitMulAfter(token) {
  if (!token) return false;
  return token.type === TOKEN_TYPES.IDENT
    || token.type === TOKEN_TYPES.LPAREN
    || token.type === TOKEN_TYPES.LBRACE;
}

function isFunctionName(token) {
  return token?.type === TOKEN_TYPES.IDENT
    && BUILTIN_FUNCTIONS.includes(String(token.value).toLowerCase());
}

function insertImplicitMultiplication(tokens) {
  if (tokens.length <= 1) return tokens;
  /** @type {Token[]} */
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const cur = tokens[i];
    const prev = out[out.length - 1];
    if (
      prev
      && cur.type !== TOKEN_TYPES.EOF
      && needsImplicitMulBefore(prev)
      && needsImplicitMulAfter(cur)
      && !(prev.type === TOKEN_TYPES.IDENT && cur.type === TOKEN_TYPES.LPAREN)
      && !(isFunctionName(prev) && (cur.type === TOKEN_TYPES.IDENT || cur.type === TOKEN_TYPES.NUMBER || cur.type === TOKEN_TYPES.LPAREN))
    ) {
      out.push({ type: TOKEN_TYPES.OP, value: '*', pos: cur.pos, end: cur.pos });
    }
    out.push(cur);
  }
  return out;
}

export class ParseError extends Error {
  /** @param {number} pos */
  constructor(message, pos) {
    super(message);
    this.name = 'ParseError';
    this.pos = pos;
  }
}
