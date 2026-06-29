export function expressionDisplayLabel(raw) {
  if (!raw?.trim()) return 'f(x)';
  const trimmed = raw.trim();
  const yEq = trimmed.match(/^y\s*=\s*(.+)$/i);
  if (yEq) return yEq[1].replace(/\s*\*\s*/g, ' ').trim();
  const fEq = trimmed.match(/^f\s*\(\s*x\s*\)\s*=\s*(.+)$/i);
  if (fEq) return fEq[1].replace(/\s*\*\s*/g, ' ').trim();
  return trimmed.replace(/\s*\*\s*/g, ' ').trim();
}

export const DEFAULT_TABLE_X = [-2, -1, 0, 1, 2];

export function defaultTableRows() {
  return DEFAULT_TABLE_X.map((x) => ({ x }));
}
