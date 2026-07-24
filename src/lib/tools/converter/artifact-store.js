/** @typedef {'memory' | 'opfs'} ArtifactBackendKind */

const OPFS_NAMESPACE = 'plexity-converter-v1';

/**
 * @param {unknown} error
 * @returns {{ code: string, message: string }}
 */
export function normalizeQuotaError(error) {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return { code: 'QUOTA_EXCEEDED', message: 'Storage quota exceeded' };
  }
  return { code: 'UNKNOWN', message: String(error ?? 'Storage error') };
}

/**
 * @returns {Promise<ArtifactBackendKind>}
 */
async function detectBackend() {
  if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
    try {
      await navigator.storage.getDirectory();
      return 'opfs';
    } catch {
      return 'memory';
    }
  }
  return 'memory';
}

/**
 * @returns {Promise<import('./artifact-store.js').ArtifactStore>}
 */
export async function createArtifactStore() {
  const kind = await detectBackend();
  if (kind === 'opfs') {
    return createOpfsArtifactStore();
  }
  return createMemoryArtifactStore();
}

/**
 * @returns {import('./artifact-store.js').ArtifactStore}
 */
export function createMemoryArtifactStore() {
  /** @type {Map<string, Blob>} */
  const blobs = new Map();

  return {
    kind: 'memory',
    async put(key, blob) {
      blobs.set(key, blob);
    },
    async get(key) {
      return blobs.get(key) ?? null;
    },
    async delete(key) {
      blobs.delete(key);
    },
    async clearJob(jobId) {
      for (const key of [...blobs.keys()]) {
        if (key.startsWith(`${jobId}/`)) blobs.delete(key);
      }
    },
    async clearAbandoned(activeKeys) {
      const active = new Set(activeKeys);
      for (const key of [...blobs.keys()]) {
        if (!active.has(key)) blobs.delete(key);
      }
    },
    async dispose() {
      blobs.clear();
    },
  };
}

/**
 * @returns {Promise<import('./artifact-store.js').ArtifactStore>}
 */
async function createOpfsArtifactStore() {
  const root = await navigator.storage.getDirectory();
  const ns = await root.getDirectoryHandle(OPFS_NAMESPACE, { create: true });
  /** @type {Map<string, FileSystemFileHandle>} */
  const handles = new Map();

  async function getFileHandle(key, create = false) {
    const parts = key.split('/');
    let dir = ns;
    for (let i = 0; i < parts.length - 1; i += 1) {
      dir = await dir.getDirectoryHandle(parts[i], { create });
    }
    const fileName = parts[parts.length - 1];
    return dir.getFileHandle(fileName, { create });
  }

  return {
    kind: 'opfs',
    async put(key, blob) {
      try {
        const handle = await getFileHandle(key, true);
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        handles.set(key, handle);
      } catch (error) {
        const normalized = normalizeQuotaError(error);
        const err = new Error(normalized.message);
        /** @type {Record<string, unknown>} */ (err).code = normalized.code;
        throw err;
      }
    },
    async get(key) {
      try {
        const handle = handles.get(key) ?? await getFileHandle(key, false);
        const file = await handle.getFile();
        return file;
      } catch {
        return null;
      }
    },
    async delete(key) {
      try {
        const parts = key.split('/');
        const fileName = parts.pop();
        let dir = ns;
        for (const part of parts) {
          dir = await dir.getDirectoryHandle(part);
        }
        await dir.removeEntry(fileName);
        handles.delete(key);
      } catch {
        // ignore missing
      }
    },
    async clearJob(jobId) {
      try {
        await ns.removeEntry(jobId, { recursive: true });
      } catch {
        // ignore
      }
      for (const key of [...handles.keys()]) {
        if (key.startsWith(`${jobId}/`)) handles.delete(key);
      }
    },
    async clearAbandoned(activeKeys) {
      const active = new Set(activeKeys);
      for (const key of [...handles.keys()]) {
        if (!active.has(key)) {
          await this.delete(key);
        }
      }
    },
    async dispose() {
      try {
        await root.removeEntry(OPFS_NAMESPACE, { recursive: true });
      } catch {
        for (const key of [...handles.keys()]) {
          await this.delete(key);
        }
      }
      handles.clear();
    },
  };
}

/**
 * @typedef {object} ArtifactStore
 * @property {ArtifactBackendKind} kind
 * @property {(key: string, blob: Blob) => Promise<void>} put
 * @property {(key: string) => Promise<Blob | null>} get
 * @property {(key: string) => Promise<void>} delete
 * @property {(jobId: string) => Promise<void>} clearJob
 * @property {(activeKeys: ReadonlyArray<string>) => Promise<void>} clearAbandoned
 * @property {() => Promise<void>} dispose
 */

/**
 * @param {string} jobId
 * @param {string} attemptId
 * @param {string} [suffix]
 * @returns {string}
 */
export function artifactKeyForJob(jobId, attemptId, suffix = 'output') {
  return `${jobId}/${attemptId}/${suffix}`;
}
