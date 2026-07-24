/**
 * Playlist discovery + selection models (Plan 6 client).
 */

import { REMOTE_QUOTAS, REMOTE_ERROR_CODES } from './remote-job-schema.js';

/**
 * @typedef {{
 *   itemId: string,
 *   providerItemId: string,
 *   redactedTitle: string,
 *   durationBucket: string,
 *   selected: boolean,
 * }} DiscoveryItem
 */

/**
 * @param {DiscoveryItem[]} items
 * @param {string} query
 */
export function filterDiscoveryItems(items, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items.slice();
  return items.filter((item) => {
    return String(item.redactedTitle || '').toLowerCase().includes(q)
      || String(item.providerItemId || '').toLowerCase().includes(q);
  });
}

/**
 * @param {DiscoveryItem[]} items
 * @param {boolean} selected
 */
export function setAllSelected(items, selected) {
  return items.map((item) => ({ ...item, selected: Boolean(selected) }));
}

/**
 * @param {DiscoveryItem[]} items
 * @param {string} itemId
 * @param {boolean} selected
 */
export function setItemSelected(items, itemId, selected) {
  return items.map((item) => (
    item.itemId === itemId ? { ...item, selected: Boolean(selected) } : item
  ));
}

/**
 * Dedupe by providerItemId keeping first occurrence.
 * @param {DiscoveryItem[]} items
 */
export function dedupeDiscoveryItems(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = String(item.providerItemId || item.itemId);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

/**
 * @param {DiscoveryItem[]} items
 * @returns {{ ok: true, selected: DiscoveryItem[] } | { ok: false, code: string }}
 */
export function validateSelection(items) {
  const selected = items.filter((i) => i.selected);
  if (!selected.length) {
    return { ok: false, code: REMOTE_ERROR_CODES.SELECTION_EMPTY };
  }
  if (selected.length > REMOTE_QUOTAS.maxSelectedItems) {
    return { ok: false, code: REMOTE_ERROR_CODES.QUOTA_EXCEEDED };
  }
  return { ok: true, selected };
}

/**
 * @param {number} index1Based
 * @param {number} width
 */
export function formatPlaylistNumber(index1Based, width = 3) {
  const n = Math.max(1, Number(index1Based) || 1);
  return String(n).padStart(Math.max(2, width), '0');
}

/**
 * @param {{
 *   index: number,
 *   title?: string,
 *   extension?: string,
 *   template?: string,
 * }} opts
 */
export function renderPlaylistFilename(opts) {
  const index = formatPlaylistNumber(opts.index);
  const title = sanitizeSegment(opts.title || 'item');
  const ext = String(opts.extension || 'mp4').replace(/^\./, '');
  const template = opts.template || '{num} - {title}.{ext}';
  return template
    .replace(/\{num\}/g, index)
    .replace(/\{title\}/g, title)
    .replace(/\{ext\}/g, ext)
    .replace(/[\\/]/g, '-');
}

/**
 * @param {string} name
 * @param {Set<string>} used
 */
export function resolveArchivePathCollision(name, used) {
  let candidate = name;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const dot = name.lastIndexOf('.');
    if (dot > 0) {
      candidate = `${name.slice(0, dot)}-${i}${name.slice(dot)}`;
    } else {
      candidate = `${name}-${i}`;
    }
    i += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

/**
 * @param {string} value
 */
function sanitizeSegment(value) {
  return String(value)
    .replace(/[^\w\s.-]+/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 80) || 'item';
}

/**
 * @param {unknown} raw
 * @returns {DiscoveryItem[]}
 */
export function normalizeDiscoveryItems(raw) {
  if (!Array.isArray(raw)) return [];
  return dedupeDiscoveryItems(raw.map((row, i) => {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    return {
      itemId: String(r.itemId || r.id || `item-${i + 1}`),
      providerItemId: String(r.providerItemId || r.itemId || `p-${i + 1}`),
      redactedTitle: String(r.redactedTitle || r.title || `Item ${i + 1}`).slice(0, 120),
      durationBucket: String(r.durationBucket || 'unknown'),
      selected: Boolean(r.selected),
    };
  }));
}
