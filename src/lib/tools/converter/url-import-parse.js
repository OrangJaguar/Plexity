/**
 * Pure URL list parsing for paste, TXT, and CSV Authorized URL Import.
 */

import { classifyImportUrl, isAcceptedProvider, isDeferredProvider, isDiscoveryProvider } from './url-import-classify.js';
import { redactUrlForDisplay, redactedSourceLabel } from './url-import-redact.js';

export const URL_IMPORT_LIMITS = Object.freeze({
  maxUrlsPerSubmission: 10,
  maxLargeListParse: 500,
  maxRawChars: 200_000,
  maxLineLength: 2048,
});

/**
 * @typedef {{
 *   maxAccepted?: number,
 *   allowPlaylist?: boolean,
 *   allowFeed?: boolean,
 * }} UrlImportParseOptions
 */

/**
 * @typedef {{
 *   localId: string,
 *   rawUrl: string,
 *   normalizedUrl: string,
 *   redactedLabel: string,
 *   redactedDisplay: string,
 *   provider: import('./url-import-classify.js').UrlImportProvider,
 *   reason?: string,
 *   youtubeVideoId?: string | null,
 *   disposition: 'accepted' | 'rejected' | 'deferred' | 'duplicate' | 'discoverable',
 * }} UrlImportEntry
 */

/**
 * @typedef {{
 *   entries: UrlImportEntry[],
 *   accepted: UrlImportEntry[],
 *   rejected: UrlImportEntry[],
 *   deferred: UrlImportEntry[],
 *   duplicates: UrlImportEntry[],
 *   discoverable: UrlImportEntry[],
 *   truncated: boolean,
 * }} UrlImportParseResult
 */

/**
 * Parse a paste / TXT blob (one URL per line; blank lines ignored).
 * @param {string} text
 * @param {UrlImportParseOptions} [opts]
 * @returns {UrlImportParseResult}
 */
export function parseUrlListText(text, opts = {}) {
  const raw = typeof text === 'string' ? text : '';
  if (raw.length > URL_IMPORT_LIMITS.maxRawChars) {
    return emptyResult({ truncated: true });
  }

  const lines = raw.split(/\r?\n/);
  const candidates = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    candidates.push(trimmed.slice(0, URL_IMPORT_LIMITS.maxLineLength));
  }
  return buildParseResult(candidates, opts);
}

/**
 * Parse CSV text. Uses the first column that looks like a URL header or
 * the first column of each row.
 * @param {string} text
 * @param {UrlImportParseOptions} [opts]
 * @returns {UrlImportParseResult}
 */
export function parseUrlListCsv(text, opts = {}) {
  const raw = typeof text === 'string' ? text : '';
  if (raw.length > URL_IMPORT_LIMITS.maxRawChars) {
    return emptyResult({ truncated: true });
  }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return emptyResult();

  let start = 0;
  let columnIndex = 0;
  const headerCells = splitCsvLine(lines[0]);
  const urlHeaderIdx = headerCells.findIndex((c) => /^url$/i.test(c.trim()));
  if (urlHeaderIdx >= 0) {
    columnIndex = urlHeaderIdx;
    start = 1;
  }

  const candidates = [];
  for (let i = start; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const cell = (cells[columnIndex] ?? cells[0] ?? '').trim();
    if (!cell) continue;
    candidates.push(cell.slice(0, URL_IMPORT_LIMITS.maxLineLength));
  }
  return buildParseResult(candidates, opts);
}

/**
 * @param {string[]} candidates
 * @param {UrlImportParseOptions} [opts]
 * @returns {UrlImportParseResult}
 */
function buildParseResult(candidates, opts = {}) {
  const maxAccepted = Number.isFinite(opts.maxAccepted)
    ? Number(opts.maxAccepted)
    : URL_IMPORT_LIMITS.maxUrlsPerSubmission;
  const classifyOpts = {
    allowPlaylist: opts.allowPlaylist === true,
    allowFeed: opts.allowFeed === true,
  };

  /** @type {UrlImportEntry[]} */
  const entries = [];
  const seen = new Set();
  let truncated = false;

  for (let i = 0; i < candidates.length; i += 1) {
    const rawUrl = candidates[i];
    const normalizedUrl = normalizeUrlCandidate(rawUrl);
    const classification = classifyImportUrl(normalizedUrl, classifyOpts);
    const fingerprint = normalizedUrl.toLowerCase();
    const localId = `url-${i + 1}-${hashShort(fingerprint)}`;

    /** @type {UrlImportEntry} */
    const entry = {
      localId,
      rawUrl,
      normalizedUrl,
      redactedLabel: redactedSourceLabel(normalizedUrl),
      redactedDisplay: redactUrlForDisplay(normalizedUrl),
      provider: classification.provider,
      reason: classification.reason,
      youtubeVideoId: classification.youtubeVideoId ?? null,
      disposition: 'rejected',
    };

    if (seen.has(fingerprint)) {
      entry.disposition = 'duplicate';
      entry.reason = 'DUPLICATE';
    } else if (isDiscoveryProvider(classification.provider)) {
      entry.disposition = 'discoverable';
      seen.add(fingerprint);
    } else if (isDeferredProvider(classification.provider)) {
      entry.disposition = 'deferred';
      seen.add(fingerprint);
    } else if (isAcceptedProvider(classification.provider)) {
      const acceptedCount = entries.filter((e) => e.disposition === 'accepted').length;
      if (acceptedCount >= maxAccepted) {
        entry.disposition = 'rejected';
        entry.reason = 'QUOTA_EXCEEDED';
        truncated = true;
      } else {
        entry.disposition = 'accepted';
        seen.add(fingerprint);
      }
    } else {
      entry.disposition = 'rejected';
      entry.reason = classification.reason || 'URL_INVALID';
      seen.add(fingerprint);
    }

    entries.push(entry);
  }

  if (candidates.length > maxAccepted && !opts.allowPlaylist) {
    truncated = truncated || entries.some((e) => e.reason === 'QUOTA_EXCEEDED');
  }

  return Object.freeze({
    entries: Object.freeze(entries),
    accepted: Object.freeze(entries.filter((e) => e.disposition === 'accepted')),
    rejected: Object.freeze(entries.filter((e) => e.disposition === 'rejected')),
    deferred: Object.freeze(entries.filter((e) => e.disposition === 'deferred')),
    duplicates: Object.freeze(entries.filter((e) => e.disposition === 'duplicate')),
    discoverable: Object.freeze(entries.filter((e) => e.disposition === 'discoverable')),
    truncated,
  });
}

/**
 * @param {string} raw
 */
export function normalizeUrlCandidate(raw) {
  let s = String(raw || '').trim();
  if (!s) return s;
  // Strip wrapping quotes from CSV.
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[a-z]{2,}/i.test(s)) {
    s = `https://${s}`;
  }
  try {
    const u = new URL(s);
    u.hash = '';
    return u.toString();
  } catch {
    return s;
  }
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

/**
 * @param {string} s
 */
function hashShort(s) {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 6);
}

/**
 * @param {{ truncated?: boolean }} [opts]
 * @returns {UrlImportParseResult}
 */
function emptyResult(opts = {}) {
  return Object.freeze({
    entries: Object.freeze([]),
    accepted: Object.freeze([]),
    rejected: Object.freeze([]),
    deferred: Object.freeze([]),
    duplicates: Object.freeze([]),
    discoverable: Object.freeze([]),
    truncated: Boolean(opts.truncated),
  });
}
