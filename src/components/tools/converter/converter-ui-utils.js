import {
  getOperationById,
  resolveConversionSupport,
} from '@/lib/tools/converter/conversion-capabilities.js';
import { estimateOutputSize } from '@/lib/tools/converter/output-estimate.js';
import { presetAppliesToSource } from '@/lib/tools/converter/converter-presets.js';
import { formatWarning, isDestructiveWarning } from '@/lib/tools/converter/converter-warnings.js';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';
import { formatByteSize } from '@/components/tools/converter/converter-utils';

export { formatByteSize, jobProgressPercent } from '@/components/tools/converter/converter-utils';

/** @type {Readonly<Record<string, string>>} */
const OPERATION_LABELS = Object.freeze({
  'png-to-jpeg': 'PNG to JPEG',
  'png-to-webp': 'PNG to WebP',
  'jpeg-to-png': 'JPEG to PNG',
  'jpeg-to-webp': 'JPEG to WebP',
  'webp-to-png': 'WebP to PNG',
  'webp-to-jpeg': 'WebP to JPEG',
  'wav-transform': 'Adjust WAV audio',
  'mp4-to-webm': 'MP4 to WebM',
  'mp4-remux': 'Remux MP4',
  'webm-to-mp4': 'WebM to MP4',
  'webm-remux': 'Remux WebM',
  'csv-to-json': 'CSV to JSON',
  'csv-to-tsv': 'CSV to TSV',
  'tsv-to-json': 'TSV to JSON',
  'tsv-to-csv': 'TSV to CSV',
  'json-to-csv': 'JSON to CSV',
  'json-to-tsv': 'JSON to TSV',
});

/**
 * @param {import('@/lib/tools/converter/conversion-capabilities.js').ConversionOperation | string | null | undefined} operation
 * @returns {string}
 */
export function getOperationLabel(operation) {
  if (!operation) return 'Unknown conversion';
  if (typeof operation === 'string') {
    return OPERATION_LABELS[operation] ?? humanizeOperationId(operation);
  }
  if ('label' in operation && typeof operation.label === 'string' && operation.label.trim()) {
    return operation.label;
  }
  return OPERATION_LABELS[operation.id] ?? humanizeOperationId(operation.id);
}

/**
 * @param {string} operationId
 * @returns {string}
 */
export function humanizeOperationId(operationId) {
  return String(operationId)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * @param {string} text
 * @returns {string}
 */
export function escapePreviewText(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * @param {number | null | undefined} seconds
 * @returns {string | null}
 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * @param {number | null | undefined} width
 * @param {number | null | undefined} height
 * @returns {string | null}
 */
export function formatDimensions(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  return `${width}×${height}px`;
}

/**
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} job
 * @param {import('@/lib/tools/converter/converter-limits.js').DeviceProfile} deviceProfile
 * @returns {ReadonlyArray<{ code: string, message: string, severity: 'info' | 'destructive' }>}
 */
export function getJobWarnings(job, deviceProfile) {
  const codes = new Set([
    ...(job.source.warnings ?? []),
    ...(job.analysis?.warnings ?? []),
  ]);

  const operation = getOperationById(job.operationId ?? '');
  if (operation?.lossy) codes.add('LOSSY');
  if (job.options?.flattenTransparency) codes.add('FLATTEN_ALPHA');
  if (operation && !resolveConversionSupport(operation, deviceProfile).supported) {
    codes.add('CODEC_FALLBACK');
  }

  return [...codes].map((code) => formatWarning(code));
}

/**
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} job
 * @param {import('@/lib/tools/converter/converter-limits.js').DeviceProfile} deviceProfile
 * @returns {ReadonlyArray<{ code: string, message: string, severity: 'info' | 'destructive' }>}
 */
export function getDestructiveWarnings(job, deviceProfile) {
  return getJobWarnings(job, deviceProfile).filter((warning) => isDestructiveWarning(warning.code));
}

/**
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} job
 * @param {Record<string, Record<string, boolean>>} acknowledgments
 * @returns {boolean}
 */
export function hasRequiredAcknowledgments(job, acknowledgments) {
  const destructive = getDestructiveWarnings(job, {});
  if (!destructive.length) return true;
  const jobAcks = acknowledgments[job.id] ?? {};
  return destructive.every((warning) => jobAcks[warning.code] === true);
}

/**
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} jobs
 * @param {string} presetId
 * @param {import('@/lib/tools/converter/converter-limits.js').DeviceProfile} deviceProfile
 * @returns {number}
 */
export function countPresetApplicableJobs(jobs, presetId, deviceProfile) {
  return jobs.filter((job) => {
    if (job.status === JOB_STATUS.COMPLETED || job.removed) return false;
    const source = {
      format: job.source.detectedFormat ?? job.analysis?.format,
      category: job.analysis?.category,
    };
    return presetAppliesToSource(presetId, source, deviceProfile);
  }).length;
}

/**
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} jobs
 * @returns {{ queue: import('@/lib/tools/converter/converter-job-model.js').ConverterJob[], completed: import('@/lib/tools/converter/converter-job-model.js').ConverterJob[] }}
 */
export function partitionJobsByCompletion(jobs) {
  const queue = [];
  const completed = [];
  for (const job of jobs) {
    if (job.status === JOB_STATUS.COMPLETED && job.output) completed.push(job);
    else queue.push(job);
  }
  return { queue, completed };
}

/**
 * @param {Record<string, unknown> | null | undefined} analysis
 * @returns {ReadonlyArray<{ label: string, value: string }>}
 */
export function buildSourceInspectorRows(analysis, source) {
  /** @type {Array<{ label: string, value: string }>} */
  const rows = [];
  const format = analysis?.format ?? source?.detectedFormat;
  if (format) rows.push({ label: 'Format', value: String(format).toUpperCase() });
  if (source?.size != null) {
    rows.push({ label: 'Size', value: formatByteSize(Number(source.size)) });
  }
  const dims = formatDimensions(
    /** @type {number | undefined} */ (analysis?.width),
    /** @type {number | undefined} */ (analysis?.height),
  );
  if (dims) rows.push({ label: 'Dimensions', value: dims });
  const duration = formatDuration(/** @type {number | undefined} */ (analysis?.durationSec));
  if (duration) rows.push({ label: 'Duration', value: duration });
  if (analysis?.codec) rows.push({ label: 'Codec', value: String(analysis.codec) });
  if (analysis?.container) rows.push({ label: 'Container', value: String(analysis.container) });
  if (analysis?.sampleRate) rows.push({ label: 'Sample rate', value: `${analysis.sampleRate} Hz` });
  if (analysis?.channels) rows.push({ label: 'Channels', value: String(analysis.channels) });
  if (analysis?.rowCount != null && analysis?.columnCount != null) {
    rows.push({ label: 'Rows / columns', value: `${analysis.rowCount} / ${analysis.columnCount}` });
  }
  if (Array.isArray(analysis?.tracks) && analysis.tracks.length) {
    rows.push({ label: 'Tracks', value: analysis.tracks.map(String).join(', ') });
  }
  return rows;
}

/**
 * @param {ReadonlySet<string>} selectedJobIds
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} jobs
 * @returns {boolean}
 */
export function allJobsSelected(selectedJobIds, jobs) {
  if (!jobs.length) return false;
  return jobs.every((job) => selectedJobIds.has(job.id));
}

/**
 * @param {ReadonlySet<string>} selectedJobIds
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} jobs
 * @returns {boolean}
 */
export function someJobsSelected(selectedJobIds, jobs) {
  return jobs.some((job) => selectedJobIds.has(job.id));
}

/**
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} job
 * @returns {string | null}
 */
export function formatJobSizeEstimate(job) {
  const operation = getOperationById(job.operationId ?? '');
  const estimate = job.estimate ?? job.plan?.estimate ?? (operation
    ? estimateOutputSize({
      category: String(job.analysis?.category ?? operation.category),
      sourceBytes: job.source.size,
      operation,
      options: job.options ?? {},
      durationSec: Number(job.analysis?.durationSec ?? 0) || null,
    })
    : null);

  if (job.output?.size != null) {
    const actual = formatByteSize(job.output.size);
    if (estimate?.bytes != null) {
      return `${actual} actual · ${formatByteSize(estimate.bytes)} estimated (${estimate.uncertainty})`;
    }
    return `${actual} actual`;
  }

  if (estimate?.bytes != null) {
    return `Est. ${formatByteSize(estimate.bytes)} (${estimate.uncertainty} confidence)`;
  }

  return null;
}
