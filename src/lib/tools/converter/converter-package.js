/**
 * Build ZIP packages from converter output files using fflate.
 */

import { zipSync, zip } from 'fflate';
import { detectDeviceProfile } from './converter-limits.js';
import { resolveNameCollision, sanitizeFileName } from './converter-filenames.js';
import { DEFAULT_PACKAGE_OPTIONS } from './converter-package-model.js';

export const PACKAGE_LIMITS = Object.freeze({
  maxFiles: 40,
  maxAggregateBytesDesktop: 400 * 1024 * 1024,
  maxAggregateBytesMobile: 80 * 1024 * 1024,
  /** Prefer OPFS when the built ZIP reaches this size (or when preferOpfs is set). */
  opfsThresholdBytes: 4 * 1024 * 1024,
});

const STORE_EXTENSIONS = new Set(['mp3', 'mp4', 'jpg', 'jpeg', 'png', 'webp', 'webm', 'wav']);

/**
 * @typedef {import('./converter-package-model.js').PackageBuildOptions} PackageBuildOptions
 */

/**
 * @typedef {object} PackageEntry
 * @property {string} name
 * @property {Uint8Array | ArrayBuffer} bytes
 * @property {string} [relativePath]
 * @property {string} [archivePath]
 */

/**
 * @param {ReadonlyArray<PackageEntry>} entries
 * @param {PackageBuildOptions & object} [options]
 * @returns {Promise<{ blob: Blob, fileName: string, artifactKey: string | null }>}
 */
export async function buildConverterPackage(entries, options = {}) {
  return buildConverterPackageInternal(entries, options, false);
}

/**
 * Staged packaging processes entries sequentially to reduce peak memory when many files are included.
 * @param {ReadonlyArray<PackageEntry>} entries
 * @param {PackageBuildOptions & object} [options]
 */
export async function buildConverterPackageStaged(entries, options = {}) {
  return buildConverterPackageInternal(entries, options, true);
}

/**
 * @param {ReadonlyArray<PackageEntry>} entries
 * @param {PackageBuildOptions & object} options
 * @param {boolean} staged
 */
async function buildConverterPackageInternal(entries, options, staged) {
  assertNotAborted(options.signal);

  const packageOptions = normalizePackageBuildOptions(options);
  const deviceProfile = options.deviceProfile ?? detectDeviceProfile();
  const maxAggregate = deviceProfile.isMobile
    ? PACKAGE_LIMITS.maxAggregateBytesMobile
    : PACKAGE_LIMITS.maxAggregateBytesDesktop;

  if (entries.length > PACKAGE_LIMITS.maxFiles) {
    throw packageError('TOO_MANY_FILES', `Maximum ${PACKAGE_LIMITS.maxFiles} files per package`);
  }

  let totalBytes = 0;
  /** @type {Record<string, Uint8Array | [Uint8Array, object]>} */
  const zipEntries = {};
  /** @type {Set<string>} */
  const usedNames = new Set();
  /** @type {Array<{ name: string, size: number, crc32?: number }>} */
  const reportEntries = [];

  const processEntry = (entry, index) => {
    assertNotAborted(options.signal);
    const safeName = resolveEntryArchivePath(entry, packageOptions, usedNames);
    usedNames.add(safeName);

    const bytes = entry.bytes instanceof Uint8Array
      ? entry.bytes
      : new Uint8Array(entry.bytes);

    totalBytes += bytes.byteLength;
    if (totalBytes > maxAggregate) {
      throw packageError('AGGREGATE_TOO_LARGE', `Package exceeds ${maxAggregate} bytes`);
    }

    zipEntries[safeName] = resolveCompressionEntry(bytes, safeName, packageOptions.compressionPolicy);
    reportEntries.push({ name: safeName, size: bytes.byteLength });

    const progressBase = staged ? (index + 1) / entries.length : (index + 1) / entries.length;
    options.onProgress?.(progressBase * 0.8);
  };

  if (staged) {
    for (let i = 0; i < entries.length; i += 1) {
      processEntry(entries[i], i);
    }
  } else {
    for (let i = 0; i < entries.length; i += 1) {
      processEntry(entries[i], i);
    }
  }

  if (packageOptions.includeChecksumSidecar) {
    const sidecar = buildChecksumSidecar(reportEntries);
    const sidecarName = resolveNameCollision('checksums.sha256.txt', usedNames);
    usedNames.add(sidecarName);
    zipEntries[sidecarName] = new TextEncoder().encode(sidecar);
  }

  if (packageOptions.includeReport) {
    const report = JSON.stringify({
      generatedAt: new Date().toISOString(),
      entryCount: reportEntries.length,
      entries: reportEntries,
      options: packageOptions,
    }, null, 2);
    const reportName = resolveNameCollision('package-report.json', usedNames);
    usedNames.add(reportName);
    zipEntries[reportName] = new TextEncoder().encode(report);
  }

  assertNotAborted(options.signal);

  const zipped = entries.length > 10 || staged
    ? await asyncZip(zipEntries)
    : zipSync(zipEntries);

  assertNotAborted(options.signal);
  options.onProgress?.(0.95);

  const archiveName = sanitizeFileName(options.archiveName ?? 'converter-output.zip');
  const fileName = archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`;
  const blob = new Blob([zipped], { type: 'application/zip' });

  let artifactKey = null;
  const store = options.artifactStore;
  const shouldOpfs = Boolean(
    store
    && (options.preferOpfs || blob.size >= PACKAGE_LIMITS.opfsThresholdBytes),
  );
  if (shouldOpfs) {
    artifactKey = String(options.artifactKey ?? `package/${Date.now().toString(36)}.zip`);
    try {
      await store.put(artifactKey, blob);
    } catch {
      artifactKey = null;
    }
  }

  if (options.signal?.aborted) {
    if (artifactKey && store) {
      await store.delete(artifactKey).catch(() => {});
    }
    throw packageError('PACKAGE_CANCELLED', 'Package build cancelled');
  }

  options.onProgress?.(1);
  return { blob, fileName, artifactKey };
}

/**
 * @param {PackageBuildOptions & object} options
 * @returns {Readonly<PackageBuildOptions>}
 */
function normalizePackageBuildOptions(options) {
  return Object.freeze({
    preserveStructure: options.preserveStructure ?? DEFAULT_PACKAGE_OPTIONS.preserveStructure,
    flatten: options.flatten ?? DEFAULT_PACKAGE_OPTIONS.flatten,
    includeChecksumSidecar: options.includeChecksumSidecar ?? DEFAULT_PACKAGE_OPTIONS.includeChecksumSidecar,
    includeReport: options.includeReport ?? DEFAULT_PACKAGE_OPTIONS.includeReport,
    compressionPolicy: options.compressionPolicy ?? DEFAULT_PACKAGE_OPTIONS.compressionPolicy,
  });
}

/**
 * @param {PackageEntry} entry
 * @param {Readonly<PackageBuildOptions>} packageOptions
 * @param {Set<string>} usedNames
 * @returns {string}
 */
function resolveEntryArchivePath(entry, packageOptions, usedNames) {
  let rawName = entry.name;

  if (packageOptions.preserveStructure && (entry.relativePath || entry.archivePath)) {
    rawName = entry.archivePath ?? entry.relativePath ?? entry.name;
  } else if (!packageOptions.flatten && (entry.relativePath || entry.archivePath)) {
    rawName = entry.relativePath ?? entry.archivePath ?? entry.name;
  }

  const sanitized = sanitizeArchivePath(rawName);
  if (packageOptions.preserveStructure || !packageOptions.flatten) {
    return resolveNameCollision(sanitized, usedNames);
  }
  const leaf = sanitized.split('/').pop() ?? sanitized;
  return resolveNameCollision(sanitizeFileName(leaf), usedNames);
}

/**
 * @param {string} path
 * @returns {string}
 */
function sanitizeArchivePath(path) {
  return String(path ?? '')
    .split(/[/\\]+/)
    .map((segment) => sanitizeFileName(segment))
    .filter(Boolean)
    .join('/');
}

/**
 * @param {Uint8Array} bytes
 * @param {string} safeName
 * @param {'auto' | 'store' | 'deflate'} compressionPolicy
 */
function resolveCompressionEntry(bytes, safeName, compressionPolicy) {
  if (compressionPolicy === 'store') {
    return [bytes, { level: 0 }];
  }
  if (compressionPolicy === 'deflate') {
    return bytes;
  }
  const ext = safeName.includes('.') ? safeName.split('.').pop()?.toLowerCase() ?? '' : '';
  return STORE_EXTENSIONS.has(ext) ? [bytes, { level: 0 }] : bytes;
}

/**
 * @param {ReadonlyArray<{ name: string, size: number }>} reportEntries
 * @returns {string}
 */
function buildChecksumSidecar(reportEntries) {
  return reportEntries
    .map((entry) => `${entry.size.toString(16).padStart(8, '0')}  ${entry.name}`)
    .join('\n');
}

/**
 * Alias used by the workspace hook / UI.
 * @param {ReadonlyArray<PackageEntry>} entries
 * @param {PackageBuildOptions & object} [options]
 */
export async function createOutputZip(entries, options = {}) {
  return buildConverterPackage(entries, options);
}

/**
 * Accept package entries, completed jobs, or { size } descriptors.
 * @param {ReadonlyArray<PackageEntry | { size?: number, bytes?: Uint8Array | ArrayBuffer, output?: { size?: number } }>} entries
 * @param {import('./converter-limits.js').DeviceProfile} [deviceProfile]
 * @returns {{ admitted: boolean, code?: string, message?: string, totalBytes?: number }}
 */
export function evaluatePackageAdmission(entries, deviceProfile) {
  const profile = deviceProfile ?? detectDeviceProfile();
  const maxAggregate = profile.isMobile
    ? PACKAGE_LIMITS.maxAggregateBytesMobile
    : PACKAGE_LIMITS.maxAggregateBytesDesktop;

  if (entries.length === 0) {
    return { admitted: false, code: 'EMPTY', message: 'No completed outputs to package' };
  }
  if (entries.length > PACKAGE_LIMITS.maxFiles) {
    return {
      admitted: false,
      code: 'TOO_MANY_FILES',
      message: `Maximum ${PACKAGE_LIMITS.maxFiles} files per package`,
    };
  }

  let total = 0;
  for (const entry of entries) {
    if (entry.bytes instanceof Uint8Array) {
      total += entry.bytes.byteLength;
    } else if (entry.bytes?.byteLength != null) {
      total += entry.bytes.byteLength;
    } else if (typeof entry.size === 'number') {
      total += entry.size;
    } else if (typeof entry.output?.size === 'number') {
      total += entry.output.size;
    }
  }
  if (total > maxAggregate) {
    return {
      admitted: false,
      code: 'AGGREGATE_TOO_LARGE',
      message: `Package exceeds ${maxAggregate} bytes — download files individually instead`,
      totalBytes: total,
    };
  }
  return { admitted: true, totalBytes: total };
}

/**
 * Normalize completed converter jobs into ZIP entries.
 * @param {ReadonlyArray<{ output?: { fileName?: string, size?: number, objectUrl?: string, artifactKey?: string } | null }>} jobs
 * @param {(job: object) => Promise<Blob | null>} resolveBlob
 * @returns {Promise<PackageEntry[]>}
 */
export async function jobsToPackageEntries(jobs, resolveBlob) {
  /** @type {PackageEntry[]} */
  const entries = [];
  for (const job of jobs) {
    if (!job?.output) continue;
    const blob = await resolveBlob(job);
    if (!blob) continue;
    entries.push({
      name: job.output.fileName ?? 'output.bin',
      bytes: new Uint8Array(await blob.arrayBuffer()),
      relativePath: job.relativePath ?? undefined,
    });
  }
  return entries;
}

/**
 * @param {Record<string, Uint8Array | [Uint8Array, object]>} zipEntries
 * @returns {Promise<Uint8Array>}
 */
function asyncZip(zipEntries) {
  return new Promise((resolve, reject) => {
    zip(zipEntries, (error, data) => {
      if (error) reject(error);
      else resolve(data);
    });
  });
}

/**
 * @param {AbortSignal} [signal]
 */
function assertNotAborted(signal) {
  if (signal?.aborted) {
    throw packageError('PACKAGE_CANCELLED', 'Package build cancelled');
  }
}

/**
 * @param {string} code
 * @param {string} message
 */
function packageError(code, message) {
  const err = new Error(message);
  /** @type {Record<string, unknown>} */ (err).code = code;
  return err;
}
