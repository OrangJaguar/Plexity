/** Pure archive path numbering for Plan 6 playlist packages. */

const PAD_WIDTH = 3;

/**
 * @param {number} index 1-based playlist index
 * @param {string} fileName
 * @param {'index-prefix' | 'flat' | 'preserve'} policy
 */
export function formatArchivePath(index, fileName, policy = 'index-prefix') {
  const safeName = sanitizeFileName(fileName || 'output');
  if (policy === 'flat') return safeName;
  if (policy === 'preserve') {
    return safeName.includes('/') ? safeName : `${padIndex(index)}-${safeName}`;
  }
  return `${padIndex(index)}-${safeName}`;
}

export function padIndex(index) {
  const n = Number(index);
  if (!Number.isFinite(n) || n < 1) return String(1).padStart(PAD_WIDTH, '0');
  return String(Math.floor(n)).padStart(PAD_WIDTH, '0');
}

export function sanitizeFileName(name) {
  const base = String(name || 'output')
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\.\./g, '_')
    .trim();
  return base.slice(0, 200) || 'output';
}

/**
 * Resolve unique archive path avoiding collisions within a package.
 * @param {Map<string, true>} used
 */
export function resolveUniqueArchivePath(index, fileName, policy, used) {
  let candidate = formatArchivePath(index, fileName, policy);
  if (!used.has(candidate)) {
    used.set(candidate, true);
    return candidate;
  }
  const extMatch = candidate.match(/(\.[^./\\]+)$/);
  const ext = extMatch ? extMatch[1] : '';
  const stem = ext ? candidate.slice(0, -ext.length) : candidate;
  let n = 2;
  while (used.has(`${stem}-${n}${ext}`)) n += 1;
  candidate = `${stem}-${n}${ext}`;
  used.set(candidate, true);
  return candidate;
}
