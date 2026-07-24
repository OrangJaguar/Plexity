import Papa from 'papaparse';
import { sanitizeFileName, replaceExtension } from '../converter-filenames.js';
import { adapterError, throwIfAborted } from './adapter-contract.js';

export const DATA_LIMITS = Object.freeze({
  MAX_ROWS: 100_000,
  MAX_COLS: 512,
  MAX_CELL_LENGTH: 10_000,
});

/**
 * @param {string} text
 * @param {string} inputFormat
 * @returns {unknown[]}
 */
export function parseDataText(text, inputFormat) {
  if (inputFormat === 'json') {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
    throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'JSON must be array or object' });
  }

  const delimiter = inputFormat === 'tsv' ? '\t' : ',';
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    delimiter,
  });

  if (result.errors?.length) {
    throw adapterError({
      code: 'TEXT_PARSE_FAILED',
      message: result.errors[0]?.message ?? 'Parse error',
    });
  }

  return /** @type {unknown[]} */ (result.data);
}

/**
 * @param {unknown[]} rows
 */
export function validateDataRows(rows) {
  if (rows.length > DATA_LIMITS.MAX_ROWS) {
    throw adapterError({
      code: 'FILE_TOO_LARGE',
      message: `Row count ${rows.length} exceeds limit ${DATA_LIMITS.MAX_ROWS}`,
    });
  }

  for (const row of rows) {
    if (row && typeof row === 'object') {
      const keys = Object.keys(row);
      if (keys.length > DATA_LIMITS.MAX_COLS) {
        throw adapterError({
          code: 'FILE_TOO_LARGE',
          message: `Column count exceeds limit ${DATA_LIMITS.MAX_COLS}`,
        });
      }
      for (const key of keys) {
        const val = /** @type {Record<string, unknown>} */ (row)[key];
        if (String(val ?? '').length > DATA_LIMITS.MAX_CELL_LENGTH) {
          throw adapterError({ code: 'FILE_TOO_LARGE', message: 'Cell value too large' });
        }
      }
    }
  }
}

/**
 * @param {unknown[]} rows
 * @param {string} outputFormat
 * @param {Record<string, unknown>} options
 * @returns {string}
 */
export function serializeDataRows(rows, outputFormat, options = {}) {
  if (outputFormat === 'json') {
    const pretty = options.pretty !== false;
    return pretty ? JSON.stringify(rows, null, 2) : JSON.stringify(rows);
  }

  const delimiter = outputFormat === 'tsv' ? '\t' : String(options.delimiter ?? ',');
  return Papa.unparse(rows, { delimiter, newline: '\n' });
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {string} inputFormat
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @returns {Promise<import('./adapter-contract.js').AdapterAnalyzeResult>}
 */
export async function analyzeData(sourceBytes, inputFormat, ctx) {
  throwIfAborted(ctx.signal);
  if (['yaml', 'xml', 'txt'].includes(inputFormat)) {
    const { analyzeStructured } = await import('./structured-data-adapter.js');
    return analyzeStructured(sourceBytes, inputFormat, ctx);
  }
  const text = new TextDecoder('utf-8').decode(sourceBytes);
  const rows = parseDataText(text, inputFormat);
  validateDataRows(rows);
  const colCount = rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]).length : 0;
  return {
    metadata: { rows: rows.length, columns: colCount },
    rowCount: rows.length,
    columnCount: colCount,
  };
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {string} inputFormat
 * @param {string} outputFormat
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 * @param {string} [sourceName]
 */
export async function processData(sourceBytes, inputFormat, outputFormat, ctx, sourceName = 'data') {
  throwIfAborted(ctx.signal);
  if (['yaml', 'xml', 'txt'].includes(inputFormat) || ['yaml', 'xml', 'txt'].includes(outputFormat)) {
    const { processStructured } = await import('./structured-data-adapter.js');
    return processStructured(sourceBytes, inputFormat, outputFormat, ctx, sourceName);
  }
  ctx.onProgress?.('processing', 0.1);

  const text = new TextDecoder('utf-8').decode(sourceBytes);
  const rows = parseDataText(text, inputFormat);
  validateDataRows(rows);

  ctx.onProgress?.('processing', 0.5);
  const outText = serializeDataRows(rows, outputFormat, ctx.options);
  const mime = outputFormat === 'json'
    ? 'application/json'
    : outputFormat === 'tsv'
      ? 'text/tab-separated-values'
      : 'text/csv';

  ctx.onProgress?.('processing', 0.95);
  return {
    blob: new Blob([outText], { type: `${mime};charset=utf-8` }),
    mimeType: mime,
    fileName: replaceExtension(sanitizeFileName(sourceName), outputFormat),
    metadata: { rows: rows.length },
  };
}

export const dataAdapter = Object.freeze({
  id: 'data',
  analyze: analyzeData,
  process: processData,
});
