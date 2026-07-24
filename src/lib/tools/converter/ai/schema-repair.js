/**
 * Schema inference + malformed JSON/CSV repair suggestions (drafts only).
 */

export {
  inferTableSchema,
  suggestJsonRepair,
} from './ocr-normalize.js';

/**
 * Soft CSV repair: normalize delimiter rows into a draft string.
 * @param {string} raw
 */
export function suggestCsvRepair(raw) {
  const text = String(raw || '').trim();
  if (!text) return { ok: false, draft: null };
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { ok: false, draft: null };
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const cols = lines[0].split(delim).length;
  const repaired = lines.map((line) => {
    const parts = line.split(delim);
    while (parts.length < cols) parts.push('');
    return parts.slice(0, cols).join(delim);
  }).join('\n');
  return { ok: true, draft: repaired, repaired: repaired !== text };
}
