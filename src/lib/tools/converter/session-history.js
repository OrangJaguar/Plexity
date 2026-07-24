/**
 * Memory-backed, redacted history of conversions performed in this
 * session. Entries never retain full filenames — only an anonymous
 * ordinal token and (optionally) the file extension.
 */

/**
 * @typedef {object} SessionHistoryEntry
 * @property {string} token
 * @property {string | null} extension
 * @property {string | null} category
 * @property {string | null} operationId
 * @property {string | null} status
 * @property {number | null} outputBytes
 * @property {ReadonlyArray<string>} warnings
 * @property {number} recordedAt
 */

/**
 * @param {unknown} name
 * @returns {string | null}
 */
function extensionOf(name) {
  const str = String(name ?? '');
  const idx = str.lastIndexOf('.');
  return idx > 0 ? str.slice(idx + 1).toLowerCase() : null;
}

/**
 * @param {object} summary
 * @param {number} index
 * @returns {Readonly<SessionHistoryEntry>}
 */
function sanitizeSummary(summary, index) {
  return Object.freeze({
    token: `file-${index}`,
    extension: extensionOf(summary?.name),
    category: summary?.category != null ? String(summary.category) : null,
    operationId: summary?.operationId != null ? String(summary.operationId) : null,
    status: summary?.status != null ? String(summary.status) : null,
    outputBytes: Number.isFinite(summary?.outputBytes) ? Number(summary.outputBytes) : null,
    warnings: Object.freeze([...(summary?.warnings ?? [])].map(String)),
    recordedAt: Number.isFinite(summary?.recordedAt) ? Number(summary.recordedAt) : Date.now(),
  });
}

/**
 * @param {object} [params]
 * @param {number} [params.maxEntries]
 * @returns {{
 *   add: (summary: object) => Readonly<SessionHistoryEntry> | null,
 *   list: () => ReadonlyArray<Readonly<SessionHistoryEntry>>,
 *   clear: () => void,
 *   dispose: () => void,
 * }}
 */
export function createSessionHistory(params = {}) {
  const maxEntries = Number.isFinite(params.maxEntries) && params.maxEntries > 0 ? params.maxEntries : 200;

  /** @type {Array<Readonly<SessionHistoryEntry>>} */
  let entries = [];
  let seq = 0;
  let disposed = false;

  return {
    /**
     * @param {object} summary
     * @returns {Readonly<SessionHistoryEntry> | null}
     */
    add(summary) {
      if (disposed) return null;
      seq += 1;
      const entry = sanitizeSummary(summary, seq);
      entries = [...entries, entry];
      if (entries.length > maxEntries) entries = entries.slice(entries.length - maxEntries);
      return entry;
    },

    /**
     * @returns {ReadonlyArray<Readonly<SessionHistoryEntry>>}
     */
    list() {
      return Object.freeze([...entries]);
    },

    clear() {
      entries = [];
    },

    dispose() {
      entries = [];
      disposed = true;
    },
  };
}
