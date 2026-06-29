export function formatResult(value, options = {}) {
  const { fractionDisplay = false, showExact = true, angleMode = 'RAD' } = options;

  if (value === null || value === undefined) return { text: '—', exact: false };
  if (typeof value === 'string') return { text: value, exact: true };

  if (!Number.isFinite(value)) {
    return { text: 'Undefined', exact: false };
  }

  if (fractionDisplay) {
    const frac = toFraction(value);
    if (frac) return { text: frac, exact: true };
  }

  const text = Math.abs(value) < 1e-10 ? '0' : formatDecimal(value);
  return { text, exact: showExact && Number.isInteger(value) };
}

function formatDecimal(value) {
  if (Math.abs(value) >= 1e10 || (Math.abs(value) < 1e-6 && value !== 0)) {
    return value.toExponential(8).replace(/\.?0+e/, 'e');
  }
  const rounded = Number(value.toPrecision(12));
  return String(rounded);
}

function toFraction(value, maxDen = 10000) {
  if (!Number.isFinite(value)) return null;
  let best = null;
  for (let den = 1; den <= maxDen; den++) {
    const num = Math.round(value * den);
    if (Math.abs(value - num / den) < 1e-9) {
      best = { num, den };
      break;
    }
  }
  if (!best) return null;
  const g = gcd(Math.abs(best.num), best.den);
  const n = best.num / g;
  const d = best.den / g;
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function gcd(a, b) {
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

export function formatError(error) {
  if (!error) return '';
  const map = {
    'Division by zero': 'Cannot divide by zero.',
    'Square root of negative number': 'Square root is not real for negative values.',
  };
  return map[error] || error;
}
