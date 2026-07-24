/**
 * Builds a redacted, shareable summary of a converter session's jobs.
 * Reports never include filenames, raw GPS coordinates, or file content —
 * only coarse, non-identifying fields (see converter-privacy.js).
 */

import { formatChecksumShort } from './checksums.js';

/** @type {ReadonlySet<string>} */
const ALLOWED_ITEM_KEYS = Object.freeze(new Set([
  'token',
  'extension',
  'category',
  'operationId',
  'engine',
  'status',
  'warnings',
  'errorCode',
  'outputBytes',
  'checksumShort',
  'hasGpsMetadata',
  'createdAt',
  'updatedAt',
]));

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
 * @param {object} job
 * @param {number} index
 * @returns {Readonly<Record<string, unknown>>}
 */
function sanitizeJobForReport(job, index) {
  return Object.freeze({
    token: `file-${index + 1}`,
    extension: extensionOf(job?.source?.name),
    category: job?.sourceAnalysis?.category != null ? String(job.sourceAnalysis.category) : null,
    operationId: job?.operationId != null ? String(job.operationId) : null,
    engine: job?.engine != null ? String(job.engine) : null,
    status: job?.status != null ? String(job.status) : 'unknown',
    warnings: Object.freeze([...(job?.plan?.warnings ?? [])].map(String)),
    errorCode: job?.error?.code != null ? String(job.error.code) : null,
    outputBytes: Number.isFinite(job?.output?.size) ? Number(job.output.size) : null,
    checksumShort: job?.checksum?.hex ? formatChecksumShort(job.checksum.hex) : null,
    hasGpsMetadata: Boolean(job?.sourceAnalysis?.hasGpsMetadata),
    createdAt: Number.isFinite(job?.createdAt) ? Number(job.createdAt) : null,
    updatedAt: Number.isFinite(job?.updatedAt) ? Number(job.updatedAt) : null,
  });
}

/**
 * @typedef {object} ConversionReport
 * @property {number} generatedAt
 * @property {number} jobCount
 * @property {number} succeeded
 * @property {number} failed
 * @property {number} cancelled
 * @property {ReadonlyArray<Readonly<Record<string, unknown>>>} items
 */

/**
 * @param {object} params
 * @param {ReadonlyArray<object>} params.jobs
 * @param {() => number} [params.now]
 * @returns {Readonly<ConversionReport>}
 */
export function createConversionReport(params) {
  const jobs = Array.isArray(params?.jobs) ? params.jobs : [];
  const now = params?.now ?? (() => Date.now());
  const items = jobs.map((job, index) => sanitizeJobForReport(job, index));

  return Object.freeze({
    generatedAt: now(),
    jobCount: items.length,
    succeeded: items.filter((i) => i.status === 'completed').length,
    failed: items.filter((i) => i.status === 'failed').length,
    cancelled: items.filter((i) => i.status === 'cancelled').length,
    items: Object.freeze(items),
  });
}

/**
 * Re-sanitizes a report (e.g. one that round-tripped through JSON or an
 * external source) by dropping any key outside the report's allowlist.
 * @param {object | null | undefined} report
 * @returns {Readonly<ConversionReport>}
 */
export function sanitizeReportForExport(report) {
  const items = Array.isArray(report?.items)
    ? report.items.map((item, index) => {
      const picked = {};
      for (const key of ALLOWED_ITEM_KEYS) {
        if (item && key in item) picked[key] = item[key];
      }
      return sanitizeJobForReport(
        {
          source: { name: picked.extension ? `x.${picked.extension}` : undefined },
          sourceAnalysis: { category: picked.category, hasGpsMetadata: picked.hasGpsMetadata },
          operationId: picked.operationId,
          engine: picked.engine,
          status: picked.status,
          plan: { warnings: picked.warnings },
          error: picked.errorCode ? { code: picked.errorCode } : null,
          output: { size: picked.outputBytes },
          checksum: picked.checksumShort ? { hex: picked.checksumShort } : null,
          createdAt: picked.createdAt,
          updatedAt: picked.updatedAt,
        },
        index,
      );
    })
    : [];

  return Object.freeze({
    generatedAt: Number.isFinite(report?.generatedAt) ? Number(report.generatedAt) : Date.now(),
    jobCount: items.length,
    succeeded: items.filter((i) => i.status === 'completed').length,
    failed: items.filter((i) => i.status === 'failed').length,
    cancelled: items.filter((i) => i.status === 'cancelled').length,
    items: Object.freeze(items),
  });
}

/**
 * @param {Readonly<ConversionReport>} report
 * @returns {string}
 */
export function exportReportJson(report) {
  return JSON.stringify(sanitizeReportForExport(report));
}

/**
 * @param {Readonly<ConversionReport>} report
 * @returns {string}
 */
export function exportReportMarkdown(report) {
  const safe = sanitizeReportForExport(report);
  const lines = [
    '# Conversion report',
    '',
    `Generated: ${new Date(safe.generatedAt).toISOString()}`,
    `Jobs: ${safe.jobCount} (succeeded: ${safe.succeeded}, failed: ${safe.failed}, cancelled: ${safe.cancelled})`,
    '',
    '| File | Category | Operation | Status | Output size | Warnings |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const item of safe.items) {
    const file = item.extension ? `${item.token}.${item.extension}` : item.token;
    const size = item.outputBytes != null ? `${item.outputBytes} B` : '—';
    const warnings = item.warnings.length > 0 ? item.warnings.join(', ') : '—';
    lines.push(`| ${file} | ${item.category ?? '—'} | ${item.operationId ?? '—'} | ${item.status} | ${size} | ${warnings} |`);
  }

  return lines.join('\n');
}
