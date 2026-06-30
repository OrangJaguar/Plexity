const SHORTHAND = {
  si: 'sin',
  co: 'cos',
  ta: 'tan',
  sq: 'sqrt',
  ab: 'abs',
  lo: 'log',
  int: 'integral',
  der: 'derivative',
  lim: 'limit',
};

import { BUILTIN_FUNCTIONS } from '@/lib/tools/calculator/calculator-constants';

const TRIG_WITH_PARENS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'log', 'ln', 'exp',
];

export function isBuiltinFunction(name) {
  return BUILTIN_FUNCTIONS.includes(String(name).toLowerCase());
}

export function upgradeShorthand(name) {
  const lower = String(name).toLowerCase();
  return SHORTHAND[lower] || name;
}

export function expandTemplate(input) {
  const trimmed = String(input || '').trim().toLowerCase();
  if (trimmed === 'int' || trimmed === 'integral') return '∫_{0}^{1} x^2 dx';
  if (trimmed === 'der' || trimmed === 'derivative') return 'd/dx( )';
  if (trimmed === 'lim' || trimmed === 'limit') return 'lim_{x→0}( )';
  return trimmed;
}

/** Expand a typed word when the user presses space after it. */
export function expandOnSpace(word) {
  const lower = String(word || '').toLowerCase();
  if (!lower) return null;

  if (lower === 'int' || lower === 'integral') return expandTemplate('int');
  if (lower === 'der' || lower === 'derivative') return expandTemplate('der');
  if (lower === 'lim' || lower === 'limit') return expandTemplate('lim');

  const upgraded = upgradeShorthand(lower);
  if (upgraded === 'integral') return expandTemplate('int');
  if (upgraded === 'derivative') return expandTemplate('der');
  if (upgraded === 'limit') return expandTemplate('lim');

  if (TRIG_WITH_PARENS.includes(lower)) return `${lower}(`;

  return null;
}

export const AUTOCOMPLETE_BUILTINS = [
  { label: 'sin(', value: 'sin(', kind: 'function', aliases: ['sin', 'si'] },
  { label: 'cos(', value: 'cos(', kind: 'function', aliases: ['cos', 'co'] },
  { label: 'tan(', value: 'tan(', kind: 'function', aliases: ['tan', 'ta'] },
  { label: 'sqrt(', value: 'sqrt(', kind: 'function', aliases: ['sqrt', 'sq'] },
  { label: 'abs(', value: 'abs(', kind: 'function', aliases: ['abs', 'ab'] },
  { label: 'log(', value: 'log(', kind: 'function', aliases: ['log', 'lo'] },
  { label: 'logb(', value: 'logb(2, x)', kind: 'function', aliases: ['logb'] },
  { label: 'log(base,x)', value: 'log(2, x)', kind: 'function', aliases: ['log('] },
  { label: 'ln(', value: 'ln(', kind: 'function', aliases: ['ln'] },
  { label: 'exp(', value: 'exp(', kind: 'function', aliases: ['exp'] },
  { label: 'pi', value: 'pi', kind: 'constant', aliases: ['pi'] },
  { label: 'e', value: 'e', kind: 'constant', aliases: ['e'] },
  {
    label: 'integral',
    value: '∫_{0}^{1} x^2 dx',
    kind: 'template',
    aliases: ['int', 'inte', 'integ', 'integr', 'integra', 'integral'],
  },
  {
    label: '∫ indefinite',
    value: '∫ x^2 dx',
    kind: 'template',
    aliases: ['∫'],
  },
  {
    label: 'derivative',
    value: 'd/dx( )',
    kind: 'template',
    aliases: ['der', 'deriv', 'derivat', 'derivative', 'd/dx'],
  },
  {
    label: 'limit',
    value: 'lim_{x→0}( )',
    kind: 'template',
    aliases: ['lim', 'limi', 'limit'],
  },
  { label: 'nPr', value: 'nPr(, )', kind: 'function', aliases: ['npr'] },
  { label: 'nCr', value: 'nCr(, )', kind: 'function', aliases: ['ncr'] },
];

function matchesAutocompleteQuery(entry, q) {
  if (entry.label.toLowerCase().startsWith(q)) return true;
  return (entry.aliases || []).some((alias) => {
    const a = alias.toLowerCase();
    return a.startsWith(q) || q.startsWith(a);
  });
}

export function getAutocompleteSuggestions(query, definedSymbols = []) {
  const q = String(query || '').toLowerCase();
  if (!q) return [];

  const builtinMatches = AUTOCOMPLETE_BUILTINS
    .filter((b) => matchesAutocompleteQuery(b, q))
    .map((b) => ({ ...b, rank: 1 }));

  const symbolMatches = definedSymbols
    .filter((s) => s.toLowerCase().startsWith(q) && !builtinMatches.some((b) => b.label === s))
    .map((s) => ({ label: s, value: s, kind: 'symbol', rank: 0 }));

  return [...symbolMatches, ...builtinMatches]
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .slice(0, 8);
}
