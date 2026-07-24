/**
 * Normalized source analysis from file inspection and adapter probes.
 */

/**
 * @typedef {object} SourceAnalysis
 * @property {string} category
 * @property {string} format
 * @property {number | null} width
 * @property {number | null} height
 * @property {number | null} durationSec
 * @property {number | null} channels
 * @property {number | null} sampleRate
 * @property {string | null} codec
 * @property {string | null} container
 * @property {ReadonlyArray<{ type?: string, codec?: string }>} tracks
 * @property {ReadonlyArray<{ type?: string, codec?: string, language?: string }>} subtitleTracks
 * @property {number | null} rowCount
 * @property {number | null} columnCount
 * @property {boolean | null} hasAlpha
 * @property {boolean | null} animated
 * @property {boolean | null} hasGpsMetadata
 * @property {boolean | null} hasMetadata
 * @property {string | null} colorProfile
 * @property {ReadonlyArray<string>} corruptionSignals
 * @property {ReadonlyArray<string>} warnings
 */

/**
 * @param {string} format
 * @returns {string}
 */
function inferCategory(format) {
  const f = format.toLowerCase();
  if (['png', 'jpeg', 'jpg', 'webp', 'bmp', 'gif'].includes(f)) return 'image';
  if (['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus'].includes(f)) return 'audio';
  if (['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'mpeg', 'mpg'].includes(f)) return 'video';
  if (['csv', 'tsv', 'json', 'yaml', 'xml', 'txt'].includes(f)) return 'data';
  return 'unknown';
}

/**
 * @param {object} params
 * @param {import('./file-inspection.js').InspectionResult} [params.inspection]
 * @param {Record<string, unknown>} [params.adapterAnalysis]
 * @param {string} [params.categoryOverride]
 * @returns {SourceAnalysis}
 */
export function normalizeSourceAnalysis(params) {
  const inspection = params.inspection;
  const adapter = params.adapterAnalysis ?? {};
  const format = String(
    adapter.format
    ?? inspection?.format
    ?? 'unknown',
  ).toLowerCase().replace(/^\./, '');

  const category = params.categoryOverride
    ?? String(adapter.category ?? inferCategory(format));

  const warnings = [
    ...(inspection?.warnings ?? []),
    ...(Array.isArray(adapter.warnings) ? adapter.warnings : []),
  ];

  if (adapter.hasGpsMetadata || adapter.gps) {
    warnings.push('GPS_METADATA');
  }

  return Object.freeze({
    category,
    format: format === 'jpg' ? 'jpeg' : format,
    width: numOrNull(adapter.width),
    height: numOrNull(adapter.height),
    durationSec: numOrNull(adapter.durationSec ?? adapter.duration),
    channels: numOrNull(adapter.channels),
    sampleRate: numOrNull(adapter.sampleRate),
    codec: adapter.codec != null ? String(adapter.codec) : null,
    container: adapter.container != null ? String(adapter.container) : (format || null),
    tracks: Object.freeze(
      Array.isArray(adapter.tracks)
        ? adapter.tracks.map((t) => Object.freeze({ ...t }))
        : [],
    ),
    subtitleTracks: Object.freeze(
      Array.isArray(adapter.subtitleTracks)
        ? adapter.subtitleTracks.map((t) => Object.freeze({ ...t }))
        : [],
    ),
    rowCount: numOrNull(adapter.rowCount ?? adapter.rows),
    columnCount: numOrNull(adapter.columnCount ?? adapter.columns),
    hasAlpha: boolOrNull(adapter.hasAlpha),
    animated: boolOrNull(adapter.animated),
    hasGpsMetadata: boolOrNull(adapter.hasGpsMetadata ?? adapter.gps),
    hasMetadata: boolOrNull(adapter.hasMetadata),
    colorProfile: adapter.colorProfile != null ? String(adapter.colorProfile) : null,
    corruptionSignals: Object.freeze(
      Array.isArray(adapter.corruptionSignals)
        ? adapter.corruptionSignals.map(String)
        : [],
    ),
    warnings: Object.freeze([...new Set(warnings.map(String))]),
  });
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function numOrNull(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} value
 * @returns {boolean | null}
 */
function boolOrNull(value) {
  if (value == null) return null;
  return Boolean(value);
}
