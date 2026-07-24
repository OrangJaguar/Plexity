import YAML from 'yaml';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import Papa from 'papaparse';
import { sanitizeFileName, replaceExtension } from '../converter-filenames.js';
import { adapterError, throwIfAborted } from './adapter-contract.js';
import { parseDataText, validateDataRows, serializeDataRows, DATA_LIMITS } from './data-adapter.js';

const YAML_PARSE_OPTIONS = Object.freeze({
  strict: true,
  customTags: [],
  maxAliasCount: 10,
  prettyErrors: true,
});

const YAML_STRINGIFY_OPTIONS = Object.freeze({
  indent: 2,
  lineWidth: 120,
});

const XML_PARSER_OPTIONS = Object.freeze({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  processEntities: false,
  allowBooleanAttributes: true,
});

const XML_BUILDER_OPTIONS = Object.freeze({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: true,
});

/**
 * @param {string} text
 * @returns {unknown}
 */
export function parseYamlText(text) {
  const doc = YAML.parse(text, {
    ...YAML_PARSE_OPTIONS,
    logLevel: 'error',
  });
  if (doc == null) {
    throw adapterError({ code: 'TEXT_PARSE_FAILED', message: 'Empty YAML document' });
  }
  return doc;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function serializeYaml(value) {
  return YAML.stringify(value, YAML_STRINGIFY_OPTIONS);
}

/**
 * @param {string} text
 * @returns {unknown}
 */
export function parseXmlText(text) {
  const parser = new XMLParser(XML_PARSER_OPTIONS);
  if (/<!DOCTYPE/i.test(text)) {
    throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'DTD in XML is not supported' });
  }
  return parser.parse(text);
}

/**
 * @param {unknown} value
 * @param {string} [rootElement]
 * @returns {string}
 */
export function serializeXml(value, rootElement = 'root') {
  const builder = new XMLBuilder(XML_BUILDER_OPTIONS);
  const wrapped = { [rootElement]: value };
  return builder.build(wrapped);
}

/**
 * @param {string} text
 * @param {string} inputFormat
 * @returns {unknown}
 */
export function parseStructuredText(text, inputFormat) {
  switch (inputFormat) {
    case 'yaml':
      return parseYamlText(text);
    case 'xml':
      return parseXmlText(text);
    case 'txt':
      return text.split(/\r?\n/).filter((line) => line.length > 0);
    default:
      return parseDataText(text, inputFormat);
  }
}

/**
 * @param {unknown} data
 * @param {string} outputFormat
 * @param {Record<string, unknown>} options
 * @returns {string}
 */
export function serializeStructuredData(data, outputFormat, options = {}) {
  if (Array.isArray(data) && data.every((item) => typeof item === 'string')) {
    if (outputFormat === 'txt') {
      return data.join('\n');
    }
    if (outputFormat === 'csv' || outputFormat === 'tsv') {
      const rows = data.map((line, index) => ({ value: String(line), index: index + 1 }));
      validateDataRows(rows);
      return serializeDataRows(rows, outputFormat, options);
    }
  }

  switch (outputFormat) {
    case 'yaml':
      return serializeYaml(data);
    case 'xml':
      return serializeXml(data, String(options.rootElement ?? 'root'));
    case 'txt':
      if (Array.isArray(data)) {
        return data.map((line) => (typeof line === 'object' ? JSON.stringify(line) : String(line))).join('\n');
      }
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    case 'json':
    case 'csv':
    case 'tsv':
    default: {
      const rows = normalizeToRows(data);
      validateDataRows(rows);
      return serializeDataRows(rows, outputFormat, options);
    }
  }
}

/**
 * @param {unknown} data
 * @returns {unknown[]}
 */
function normalizeToRows(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') return [data];
  throw adapterError({ code: 'UNSUPPORTED_FORMAT', message: 'Data must be object or array' });
}

/**
 * @param {Uint8Array} sourceBytes
 * @param {string} inputFormat
 * @param {import('./adapter-contract.js').AdapterContext} ctx
 */
export async function analyzeStructured(sourceBytes, inputFormat, ctx) {
  throwIfAborted(ctx.signal);
  const text = new TextDecoder('utf-8').decode(sourceBytes);
  const data = parseStructuredText(text, inputFormat);
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length > DATA_LIMITS.MAX_ROWS) {
    throw adapterError({ code: 'FILE_TOO_LARGE', message: 'Too many rows' });
  }
  const colCount = rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0]).length : 0;
  return {
    metadata: { format: inputFormat },
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
export async function processStructured(sourceBytes, inputFormat, outputFormat, ctx, sourceName = 'data') {
  throwIfAborted(ctx.signal);
  ctx.onProgress?.('processing', 0.1);
  const text = new TextDecoder('utf-8').decode(sourceBytes);
  const data = parseStructuredText(text, inputFormat);
  const outText = serializeStructuredData(data, outputFormat, ctx.options);
  const mime = mimeForFormat(outputFormat);
  ctx.onProgress?.('processing', 0.95);
  return {
    blob: new Blob([outText], { type: `${mime};charset=utf-8` }),
    mimeType: mime,
    fileName: replaceExtension(sanitizeFileName(sourceName), outputFormat),
    metadata: { format: outputFormat },
  };
}

/**
 * @param {string} format
 */
function mimeForFormat(format) {
  const map = {
    json: 'application/json',
    yaml: 'application/yaml',
    xml: 'application/xml',
    txt: 'text/plain',
    csv: 'text/csv',
    tsv: 'text/tab-separated-values',
  };
  return map[format] ?? 'application/octet-stream';
}

export const structuredDataAdapter = Object.freeze({
  id: 'structured-data',
  analyze: analyzeStructured,
  process: processStructured,
});
