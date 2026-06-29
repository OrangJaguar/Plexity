export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values, sample = true) {
  if (values.length < 2) return 0;
  const m = mean(values);
  const sum = values.reduce((a, v) => a + (v - m) ** 2, 0);
  return sum / (sample ? values.length - 1 : values.length);
}

export function stdev(values, sample = true) {
  return Math.sqrt(variance(values, sample));
}

export function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function quartiles(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q2 = median(sorted);
  const lower = sorted.slice(0, Math.floor(sorted.length / 2));
  const upper = sorted.slice(Math.ceil(sorted.length / 2));
  return { q1: median(lower), q2, q3: median(upper) };
}

export function normalPdf(x, mean = 0, stdevVal = 1) {
  const s = stdevVal || 1;
  return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / s) ** 2);
}

export function normalCdf(x, mean = 0, stdevVal = 1) {
  const z = (x - mean) / (stdevVal * Math.SQRT2);
  return 0.5 * (1 + erf(z));
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

export function binomialPmf(k, n, p) {
  return nCr(n, k) * (p ** k) * ((1 - p) ** (n - k));
}

function nCr(n, r) {
  if (r < 0 || r > n) return 0;
  let num = 1;
  for (let i = 0; i < r; i++) num = (num * (n - i)) / (i + 1);
  return num;
}

export function poissonPmf(k, lambda) {
  return (lambda ** k * Math.exp(-lambda)) / factorial(k);
}

function factorial(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

export function uniformPdf(x, a, b) {
  if (x < a || x > b) return 0;
  return 1 / (b - a);
}

export function probabilityBetween(dist, a, b, params) {
  if (dist === 'normal') {
    return normalCdf(b, params.mean, params.stdev) - normalCdf(a, params.mean, params.stdev);
  }
  return 0;
}

export function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  const intercept = my - slope * mx;
  const yMean = my;
  const ssTot = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

export function polynomialRegression(xs, ys, degree = 2) {
  if (degree !== 2 || xs.length < 3) return linearRegression(xs, ys);
  return linearRegression(xs, ys);
}

export function confidenceInterval(values, confidence = 0.95) {
  const m = mean(values);
  const s = stdev(values);
  const z = confidence === 0.95 ? 1.96 : 2.576;
  const margin = z * (s / Math.sqrt(values.length));
  return { mean: m, low: m - margin, high: m + margin };
}

export function zTestMean(values, mu0) {
  const m = mean(values);
  const s = stdev(values);
  const z = (m - mu0) / (s / Math.sqrt(values.length));
  return { z, mean: m, stdev: s };
}

export function parseCsvColumn(text) {
  return String(text || '')
    .split(/[\n,]/)
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
}

export function histogramBins(values, binCount = 10) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = (max - min || 1) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  });
  return bins;
}
