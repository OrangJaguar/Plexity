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

export function isBuiltinFunction(name) {
  return BUILTIN_FUNCTIONS.includes(String(name).toLowerCase());
}

export function upgradeShorthand(name) {
  const lower = String(name).toLowerCase();
  return SHORTHAND[lower] || name;
}

export function expandTemplate(input) {
  const trimmed = String(input || '').trim();
  if (trimmed === 'int') return 'integral( , x)';
  if (trimmed === 'der') return 'derivative( , x)';
  if (trimmed === 'lim') return 'limit( , x, 0)';
  return trimmed;
}

export const AUTOCOMPLETE_BUILTINS = [
  { label: 'sin(', value: 'sin(', kind: 'function' },
  { label: 'cos(', value: 'cos(', kind: 'function' },
  { label: 'tan(', value: 'tan(', kind: 'function' },
  { label: 'sqrt(', value: 'sqrt(', kind: 'function' },
  { label: 'abs(', value: 'abs(', kind: 'function' },
  { label: 'log(', value: 'log(', kind: 'function' },
  { label: 'ln(', value: 'ln(', kind: 'function' },
  { label: 'exp(', value: 'exp(', kind: 'function' },
  { label: 'pi', value: 'pi', kind: 'constant' },
  { label: 'e', value: 'e', kind: 'constant' },
  { label: 'integral', value: 'integral( , x)', kind: 'template' },
  { label: 'derivative', value: 'derivative( , x)', kind: 'template' },
  { label: 'limit', value: 'limit( , x, 0)', kind: 'template' },
  { label: 'nPr', value: 'nPr(, )', kind: 'function' },
  { label: 'nCr', value: 'nCr(, )', kind: 'function' },
];

export function getAutocompleteSuggestions(query, definedSymbols = []) {
  const q = String(query || '').toLowerCase();
  if (!q) return [];

  const builtinMatches = AUTOCOMPLETE_BUILTINS
    .filter((b) => b.label.toLowerCase().startsWith(q))
    .map((b) => ({ ...b, rank: 1 }));

  const symbolMatches = definedSymbols
    .filter((s) => s.toLowerCase().startsWith(q) && !builtinMatches.some((b) => b.label === s))
    .map((s) => ({ label: s, value: s, kind: 'symbol', rank: 0 }));

  return [...symbolMatches, ...builtinMatches]
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .slice(0, 8);
}
