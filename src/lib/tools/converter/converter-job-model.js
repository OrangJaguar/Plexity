/** @typedef {'waiting' | 'queued' | 'analyzing' | 'processing' | 'completed' | 'failed' | 'cancelled'} ConverterJobStatus */

/** @typedef {'FILE_EMPTY' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_FORMAT' | 'INSPECTION_FAILED' | 'OPERATION_UNSUPPORTED' | 'ANALYSIS_FAILED' | 'PROCESSING_FAILED' | 'MEMORY_BUDGET_EXCEEDED' | 'DIMENSIONS_TOO_LARGE' | 'WORKER_CRASHED' | 'WORKER_TIMEOUT' | 'CANCELLED' | 'DOWNLOAD_FAILED' | 'QUOTA_EXCEEDED' | 'TARGET_SIZE_FAILED' | 'MERGE_INCOMPATIBLE' | 'SPLIT_LIMIT_EXCEEDED' | 'RECIPE_INVALID' | 'CHECKSUM_FAILED' | 'HISTORY_QUOTA' | 'UNKNOWN'} ConverterErrorCode */

import { normalizeConversionPlan } from './conversion-plan.js';

export const JOB_STATUS = Object.freeze({
  WAITING: 'waiting',
  QUEUED: 'queued',
  ANALYZING: 'analyzing',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

export const ERROR_CODES = Object.freeze({
  FILE_EMPTY: 'FILE_EMPTY',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
  INSPECTION_FAILED: 'INSPECTION_FAILED',
  OPERATION_UNSUPPORTED: 'OPERATION_UNSUPPORTED',
  ANALYSIS_FAILED: 'ANALYSIS_FAILED',
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  MEMORY_BUDGET_EXCEEDED: 'MEMORY_BUDGET_EXCEEDED',
  DIMENSIONS_TOO_LARGE: 'DIMENSIONS_TOO_LARGE',
  WORKER_CRASHED: 'WORKER_CRASHED',
  WORKER_TIMEOUT: 'WORKER_TIMEOUT',
  CANCELLED: 'CANCELLED',
  DOWNLOAD_FAILED: 'DOWNLOAD_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RUNTIME_LOAD_FAILED: 'RUNTIME_LOAD_FAILED',
  FFMPEG_LOAD_FAILED: 'FFMPEG_LOAD_FAILED',
  FFMPEG_TIMEOUT: 'FFMPEG_TIMEOUT',
  CODEC_UNSUPPORTED: 'CODEC_UNSUPPORTED',
  ANIMATION_REQUIRES_ACK: 'ANIMATION_REQUIRES_ACK',
  TRACK_UNSUPPORTED: 'TRACK_UNSUPPORTED',
  CLIPBOARD_UNAVAILABLE: 'CLIPBOARD_UNAVAILABLE',
  FOLDER_LIMIT_EXCEEDED: 'FOLDER_LIMIT_EXCEEDED',
  PACKAGE_LIMIT_EXCEEDED: 'PACKAGE_LIMIT_EXCEEDED',
  PACKAGE_FAILED: 'PACKAGE_FAILED',
  PACKAGE_CANCELLED: 'PACKAGE_CANCELLED',
  INTERRUPTED: 'INTERRUPTED',
  TARGET_SIZE_FAILED: 'TARGET_SIZE_FAILED',
  MERGE_INCOMPATIBLE: 'MERGE_INCOMPATIBLE',
  SPLIT_LIMIT_EXCEEDED: 'SPLIT_LIMIT_EXCEEDED',
  RECIPE_INVALID: 'RECIPE_INVALID',
  CHECKSUM_FAILED: 'CHECKSUM_FAILED',
  HISTORY_QUOTA: 'HISTORY_QUOTA',
  UNKNOWN: 'UNKNOWN',
});

const TERMINAL_STATUSES = new Set([
  JOB_STATUS.COMPLETED,
  JOB_STATUS.FAILED,
  JOB_STATUS.CANCELLED,
]);

let globalIdSeq = 0;

/**
 * @param {string} [prefix]
 * @returns {() => string}
 */
export function createIdFactory(prefix = 'job') {
  let seq = 0;
  return () => `${prefix}-${Date.now().toString(36)}-${(globalIdSeq += 1).toString(36)}-${(seq += 1).toString(36)}`;
}

/**
 * @param {object} source
 * @returns {Readonly<import('./converter-job-model.js').ConverterSourceDescriptor>}
 */
export function createSourceDescriptor(source) {
  return Object.freeze({
    name: String(source.name ?? 'unknown'),
    size: Number(source.size ?? 0),
    mimeType: source.mimeType ? String(source.mimeType) : null,
    lastModified: source.lastModified != null ? Number(source.lastModified) : null,
    detectedFormat: source.detectedFormat ? String(source.detectedFormat) : null,
    detectedMime: source.detectedMime ? String(source.detectedMime) : null,
    warnings: Object.freeze([...(source.warnings ?? [])]),
  });
}

/**
 * @param {object} [error]
 * @returns {Readonly<import('./converter-job-model.js').ConverterErrorDescriptor> | null}
 */
export function createErrorDescriptor(error) {
  if (!error) return null;
  return Object.freeze({
    code: /** @type {ConverterErrorCode} */ (String(error.code ?? ERROR_CODES.UNKNOWN)),
    message: String(error.message ?? 'Unknown error'),
    details: error.details != null ? Object.freeze({ ...error.details }) : null,
  });
}

/**
 * @param {object} output
 * @returns {Readonly<import('./converter-job-model.js').ConverterOutputDescriptor> | null}
 */
export function createOutputDescriptor(output) {
  if (!output) return null;
  return Object.freeze({
    fileName: String(output.fileName ?? 'output.bin'),
    mimeType: String(output.mimeType ?? 'application/octet-stream'),
    size: Number(output.size ?? 0),
    artifactKey: output.artifactKey ? String(output.artifactKey) : null,
    objectUrl: output.objectUrl ? String(output.objectUrl) : null,
  });
}

/**
 * @param {object} params
 * @param {() => string} [params.idFactory]
 * @param {() => number} [params.now]
 * @returns {Readonly<import('./converter-job-model.js').ConverterJob>}
 */
export function createJob(params) {
  const idFactory = params.idFactory ?? createIdFactory('job');
  const now = params.now ?? (() => Date.now());
  const ts = now();

  const job = {
    id: idFactory(),
    attemptId: createAttemptId({ idFactory, now }),
    status: JOB_STATUS.WAITING,
    operationId: params.operationId ? String(params.operationId) : null,
    goalId: params.goalId ? String(params.goalId) : null,
    plan: params.plan ? normalizeConversionPlan(params.plan) : null,
    engine: params.engine ? String(params.engine) : null,
    sourceAnalysis: params.sourceAnalysis != null ? Object.freeze({ ...params.sourceAnalysis }) : null,
    acknowledgments: Object.freeze({ ...(params.acknowledgments ?? {}) }),
    source: createSourceDescriptor(params.source ?? {}),
    analysis: params.analysis != null ? Object.freeze({ ...params.analysis }) : null,
    progress: Object.freeze({ phase: null, fraction: 0 }),
    output: null,
    outputs: params.outputs ?? null,
    error: null,
    createdAt: ts,
    updatedAt: ts,
    removed: false,
    options: Object.freeze({ ...(params.options ?? {}) }),
    parentJobId: params.parentJobId ?? null,
    childJobIds: params.childJobIds ?? [],
    relativePath: params.relativePath ?? null,
    estimate: params.estimate ?? null,
    checksum: params.checksum ?? null,
    recipeId: params.recipeId ?? null,
    mergeGroupId: params.mergeGroupId ?? null,
    splitSpec: params.splitSpec ?? null,
    reportRef: params.reportRef ?? null,
  };

  return normalizeJob(job);
}

/**
 * @param {object} [params]
 * @param {() => string} [params.idFactory]
 * @param {() => number} [params.now]
 * @returns {string}
 */
export function createAttemptId(params = {}) {
  const idFactory = params.idFactory ?? createIdFactory('attempt');
  return idFactory();
}

/**
 * @param {object} job
 * @returns {Readonly<import('./converter-job-model.js').ConverterJob>}
 */
export function normalizeJob(job) {
  const outputs = Object.freeze(
    (Array.isArray(job.outputs) ? job.outputs : [])
      .map((o) => createOutputDescriptor(o))
      .filter(Boolean),
  );

  const normalized = {
    id: String(job.id),
    attemptId: String(job.attemptId),
    status: /** @type {ConverterJobStatus} */ (job.status),
    operationId: job.operationId ? String(job.operationId) : null,
    goalId: job.goalId ? String(job.goalId) : null,
    plan: normalizeConversionPlan(job.plan),
    engine: job.engine ? String(job.engine) : null,
    sourceAnalysis: job.sourceAnalysis != null ? Object.freeze({ ...job.sourceAnalysis }) : null,
    acknowledgments: Object.freeze(
      Object.fromEntries(
        Object.entries(job.acknowledgments ?? {}).map(([k, v]) => [String(k), Boolean(v)]),
      ),
    ),
    source: createSourceDescriptor(job.source ?? {}),
    analysis: job.analysis != null ? Object.freeze({ ...job.analysis }) : null,
    progress: Object.freeze({
      phase: job.progress?.phase ?? null,
      fraction: clampFraction(job.progress?.fraction ?? 0),
    }),
    output: createOutputDescriptor(job.output),
    outputs,
    error: createErrorDescriptor(job.error),
    createdAt: Number(job.createdAt ?? Date.now()),
    updatedAt: Number(job.updatedAt ?? Date.now()),
    removed: Boolean(job.removed),
    options: Object.freeze({ ...(job.options ?? {}) }),
    parentJobId: job.parentJobId != null ? String(job.parentJobId) : null,
    childJobIds: Object.freeze([...(job.childJobIds ?? [])].map(String)),
    relativePath: job.relativePath != null ? String(job.relativePath) : null,
    estimate: normalizeJobEstimate(job.estimate),
    checksum: job.checksum != null ? String(job.checksum) : null,
    recipeId: job.recipeId != null ? String(job.recipeId) : null,
    mergeGroupId: job.mergeGroupId != null ? String(job.mergeGroupId) : null,
    splitSpec: normalizeJobSplitSpec(job.splitSpec),
    reportRef: job.reportRef != null ? String(job.reportRef) : null,
  };

  return Object.freeze(normalized);
}

/**
 * @param {ConverterJobStatus} status
 * @returns {boolean}
 */
export function isTerminalStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampFraction(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/**
 * @param {unknown} value
 * @returns {{ bytes: number | null, uncertainty: 'low' | 'medium' | 'high' } | null}
 */
function normalizeJobEstimate(value) {
  if (!value || typeof value !== 'object') return null;
  const uncertainty = /** @type {{ uncertainty?: string }} */ (value).uncertainty;
  const bytesRaw = /** @type {{ bytes?: unknown }} */ (value).bytes;
  const bytes = bytesRaw == null || bytesRaw === '' ? null : Number(bytesRaw);
  return Object.freeze({
    bytes: Number.isFinite(bytes) ? bytes : null,
    uncertainty: uncertainty === 'low' || uncertainty === 'high' ? uncertainty : 'medium',
  });
}

/**
 * @param {unknown} value
 * @returns {{ mode: 'duration' | 'size' | 'count', value: number } | null}
 */
function normalizeJobSplitSpec(value) {
  if (!value || typeof value !== 'object') return null;
  const mode = /** @type {{ mode?: string }} */ (value).mode;
  const raw = Number(/** @type {{ value?: unknown }} */ (value).value);
  if (!['duration', 'size', 'count'].includes(String(mode)) || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return Object.freeze({
    mode: /** @type {'duration' | 'size' | 'count'} */ (mode),
    value: raw,
  });
}

/**
 * @typedef {object} ConverterSourceDescriptor
 * @property {string} name
 * @property {number} size
 * @property {string | null} mimeType
 * @property {number | null} lastModified
 * @property {string | null} detectedFormat
 * @property {string | null} detectedMime
 * @property {ReadonlyArray<string>} warnings
 */

/**
 * @typedef {object} ConverterErrorDescriptor
 * @property {ConverterErrorCode} code
 * @property {string} message
 * @property {Readonly<Record<string, unknown>> | null} details
 */

/**
 * @typedef {object} ConverterOutputDescriptor
 * @property {string} fileName
 * @property {string} mimeType
 * @property {number} size
 * @property {string | null} artifactKey
 * @property {string | null} objectUrl
 */

/**
 * @typedef {object} ConverterJob
 * @property {string} id
 * @property {string} attemptId
 * @property {ConverterJobStatus} status
 * @property {string | null} operationId
 * @property {string | null} goalId
 * @property {import('./conversion-plan.js').ConversionPlan | null} plan
 * @property {string | null} engine
 * @property {Record<string, unknown> | null} sourceAnalysis
 * @property {Readonly<Record<string, boolean>>} acknowledgments
 * @property {ConverterSourceDescriptor} source
 * @property {Record<string, unknown> | null} analysis
 * @property {{ phase: string | null, fraction: number }} progress
 * @property {ConverterOutputDescriptor | null} output
 * @property {ReadonlyArray<ConverterOutputDescriptor>} outputs
 * @property {ConverterErrorDescriptor | null} error
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {boolean} removed
 * @property {Readonly<Record<string, unknown>>} options
 * @property {string | null} parentJobId
 * @property {ReadonlyArray<string>} childJobIds
 * @property {string | null} relativePath
 * @property {{ bytes: number | null, uncertainty: 'low' | 'medium' | 'high' } | null} estimate
 * @property {string | null} checksum
 * @property {string | null} recipeId
 * @property {string | null} mergeGroupId
 * @property {{ mode: 'duration' | 'size' | 'count', value: number } | null} splitSpec
 * @property {string | null} reportRef
 */
