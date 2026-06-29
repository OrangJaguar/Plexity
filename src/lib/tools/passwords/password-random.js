/**
 * Uniform index in [0, max) using crypto.getRandomValues (rejection sampling).
 */
export function secureRandomIndex(max) {
  if (!Number.isInteger(max) || max <= 0) {
    throw new RangeError('secureRandomIndex requires a positive integer max');
  }
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let sample = 0;
  do {
    crypto.getRandomValues(buf);
    sample = buf[0];
  } while (sample >= limit);
  return sample % max;
}

export function securePick(pool) {
  if (!pool?.length) throw new RangeError('securePick requires a non-empty pool');
  return pool[secureRandomIndex(pool.length)];
}

export function secureShuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = secureRandomIndex(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
