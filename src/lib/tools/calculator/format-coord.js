export function formatCoord(value, places = 3) {
  if (!Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(places));
  if (Math.abs(rounded) < 10 ** -places) return '0';
  return String(rounded);
}

export function formatPointLabel(x, y, places = 3) {
  return `(${formatCoord(x, places)}, ${formatCoord(y, places)})`;
}
