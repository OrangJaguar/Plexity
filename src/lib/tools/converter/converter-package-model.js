/**
 * Immutable job model for a ZIP package build (see converter-package.js for
 * the actual archive builder).
 */

/** @typedef {'idle' | 'building' | 'completed' | 'failed' | 'cancelled'} PackageJobStatus */

export const PACKAGE_JOB_STATUS = Object.freeze({
  IDLE: 'idle',
  BUILDING: 'building',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
});

/** @typedef {'auto' | 'store' | 'deflate'} PackageCompressionPolicy */

/**
 * @typedef {object} PackageBuildOptions
 * @property {boolean} [preserveStructure]
 * @property {boolean} [flatten]
 * @property {boolean} [includeChecksumSidecar]
 * @property {boolean} [includeReport]
 * @property {PackageCompressionPolicy} [compressionPolicy]
 */

export const DEFAULT_PACKAGE_OPTIONS = Object.freeze({
  preserveStructure: false,
  flatten: true,
  includeChecksumSidecar: false,
  includeReport: false,
  compressionPolicy: 'auto',
});

const TERMINAL_STATUSES = new Set([
  PACKAGE_JOB_STATUS.COMPLETED,
  PACKAGE_JOB_STATUS.FAILED,
  PACKAGE_JOB_STATUS.CANCELLED,
]);

/**
 * @param {object} [error]
 * @returns {Readonly<{ code: string, message: string }> | null}
 */
function createPackageErrorDescriptor(error) {
  if (!error) return null;
  return Object.freeze({
    code: String(error.code ?? 'UNKNOWN'),
    message: String(error.message ?? 'Package build failed'),
  });
}

/**
 * @param {object} [artifact]
 * @returns {Readonly<{ fileName: string, size: number, objectUrl: string | null, artifactKey: string | null }> | null}
 */
function createPackageArtifactDescriptor(artifact) {
  if (!artifact) return null;
  return Object.freeze({
    fileName: String(artifact.fileName ?? 'converter-output.zip'),
    size: Number(artifact.size ?? 0),
    objectUrl: artifact.objectUrl ? String(artifact.objectUrl) : null,
    artifactKey: artifact.artifactKey ? String(artifact.artifactKey) : null,
  });
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
 * @param {object} job
 * @returns {Readonly<PackageJob>}
 */
export function normalizePackageJob(job) {
  return Object.freeze({
    outputKeys: Object.freeze([...(job.outputKeys ?? [])].map(String)),
    status: /** @type {PackageJobStatus} */ (job.status ?? PACKAGE_JOB_STATUS.IDLE),
    progress: clampFraction(job.progress ?? 0),
    error: createPackageErrorDescriptor(job.error),
    artifact: createPackageArtifactDescriptor(job.artifact),
    createdAt: Number(job.createdAt ?? Date.now()),
    updatedAt: Number(job.updatedAt ?? Date.now()),
  });
}

/**
 * @param {object} params
 * @param {ReadonlyArray<string>} params.outputKeys
 * @param {() => number} [params.now]
 * @returns {Readonly<PackageJob>}
 */
export function createPackageJob(params) {
  const now = params.now ?? (() => Date.now());
  const ts = now();
  return normalizePackageJob({
    outputKeys: params.outputKeys ?? [],
    status: PACKAGE_JOB_STATUS.IDLE,
    progress: 0,
    error: null,
    artifact: null,
    createdAt: ts,
    updatedAt: ts,
  });
}

/**
 * @param {PackageJobStatus} status
 * @returns {boolean}
 */
export function isTerminalPackageStatus(status) {
  return TERMINAL_STATUSES.has(status);
}

/**
 * @param {Readonly<PackageJob>} job
 * @param {() => number} [now]
 * @returns {Readonly<PackageJob>}
 */
export function startPackageJob(job, now = () => Date.now()) {
  return normalizePackageJob({ ...job, status: PACKAGE_JOB_STATUS.BUILDING, progress: 0, error: null, updatedAt: now() });
}

/**
 * @param {Readonly<PackageJob>} job
 * @param {number} progress
 * @param {() => number} [now]
 * @returns {Readonly<PackageJob>}
 */
export function updatePackageJobProgress(job, progress, now = () => Date.now()) {
  return normalizePackageJob({ ...job, status: PACKAGE_JOB_STATUS.BUILDING, progress, updatedAt: now() });
}

/**
 * @param {Readonly<PackageJob>} job
 * @param {object} artifact
 * @param {() => number} [now]
 * @returns {Readonly<PackageJob>}
 */
export function completePackageJob(job, artifact, now = () => Date.now()) {
  return normalizePackageJob({
    ...job,
    status: PACKAGE_JOB_STATUS.COMPLETED,
    progress: 1,
    artifact,
    error: null,
    updatedAt: now(),
  });
}

/**
 * @param {Readonly<PackageJob>} job
 * @param {object} error
 * @param {() => number} [now]
 * @returns {Readonly<PackageJob>}
 */
export function failPackageJob(job, error, now = () => Date.now()) {
  return normalizePackageJob({ ...job, status: PACKAGE_JOB_STATUS.FAILED, error, updatedAt: now() });
}

/**
 * @param {Readonly<PackageJob>} job
 * @param {() => number} [now]
 * @returns {Readonly<PackageJob>}
 */
export function cancelPackageJob(job, now = () => Date.now()) {
  return normalizePackageJob({
    ...job,
    status: PACKAGE_JOB_STATUS.CANCELLED,
    error: { code: 'PACKAGE_CANCELLED', message: 'Package build cancelled' },
    updatedAt: now(),
  });
}

/**
 * @typedef {object} PackageJob
 * @property {ReadonlyArray<string>} outputKeys
 * @property {PackageJobStatus} status
 * @property {number} progress
 * @property {Readonly<{ code: string, message: string }> | null} error
 * @property {Readonly<{ fileName: string, size: number, objectUrl: string | null, artifactKey: string | null }> | null} artifact
 * @property {number} createdAt
 * @property {number} updatedAt
 */
