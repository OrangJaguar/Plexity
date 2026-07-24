/**
 * IndexedDB persistence for Video Plan 3 session resume.
 */

import { VIDEO_SCHEMA_VERSION, cloneProject } from './video-project.js';

export const VIDEO_IDB_NAME = 'plexity-video';
export const VIDEO_IDB_VERSION = 1;
export const VIDEO_IDB_STORE_PROJECT = 'project';
export const VIDEO_IDB_STORE_MEDIA = 'media';
export const VIDEO_IDB_PROJECT_KEY = 'current';

/**
 * @returns {Promise<IDBDatabase>}
 */
function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(Object.assign(new Error('IndexedDB unavailable'), { code: 'UNSUPPORTED' }));
      return;
    }
    const req = indexedDB.open(VIDEO_IDB_NAME, VIDEO_IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(VIDEO_IDB_STORE_PROJECT)) {
        db.createObjectStore(VIDEO_IDB_STORE_PROJECT);
      }
      if (!db.objectStoreNames.contains(VIDEO_IDB_STORE_MEDIA)) {
        db.createObjectStore(VIDEO_IDB_STORE_MEDIA);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

/**
 * Serialize project for storage (strip object URLs; keep blob refs for separate store).
 * @param {import('./video-project.js').VideoProject} project
 */
export function serializeProjectForPersist(project) {
  const cloned = cloneProject(project);
  return {
    ...cloned,
    schemaVersion: cloned.schemaVersion || VIDEO_SCHEMA_VERSION,
    media: cloned.media.map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      mime: m.mime,
      durationMs: m.durationMs,
      width: m.width,
      height: m.height,
      fileBytes: m.fileBytes,
      fromVo: m.fromVo,
      objectUrl: '',
      // blob stored separately
    })),
  };
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @returns {Promise<{ ok: true } | { ok: false, code: string, message: string }>}
 */
export async function saveVideoSession(project) {
  try {
    const db = await openDb();
    const meta = serializeProjectForPersist(project);
    await idbPut(db, VIDEO_IDB_STORE_PROJECT, VIDEO_IDB_PROJECT_KEY, {
      savedAt: Date.now(),
      project: meta,
    });
    for (const m of project.media) {
      if (!m.blob) continue;
      await idbPut(db, VIDEO_IDB_STORE_MEDIA, m.id, {
        id: m.id,
        blob: m.blob,
        mime: m.mime,
        name: m.name,
      });
    }
    // prune removed media
    const keys = await idbGetAllKeys(db, VIDEO_IDB_STORE_MEDIA);
    const keep = new Set(project.media.map((m) => m.id));
    for (const key of keys) {
      if (!keep.has(String(key))) await idbDelete(db, VIDEO_IDB_STORE_MEDIA, key);
    }
    db.close();
    return { ok: true };
  } catch (err) {
    const name = err && /** @type {DOMException} */ (err).name;
    if (name === 'QuotaExceededError') {
      return { ok: false, code: 'QUOTA', message: 'Storage full — could not save this session.' };
    }
    return {
      ok: false,
      code: 'SAVE',
      message: err instanceof Error ? err.message : 'Could not save session.',
    };
  }
}

/**
 * @returns {Promise<{ project: import('./video-project.js').VideoProject, savedAt: number } | null>}
 */
export async function loadVideoSession() {
  try {
    const db = await openDb();
    const row = await idbGet(db, VIDEO_IDB_STORE_PROJECT, VIDEO_IDB_PROJECT_KEY);
    if (!row?.project) {
      db.close();
      return null;
    }
    const meta = row.project;
    /** @type {import('./video-project.js').MediaAsset[]} */
    const media = [];
    for (const stub of meta.media || []) {
      const packed = await idbGet(db, VIDEO_IDB_STORE_MEDIA, stub.id);
      if (!packed?.blob) continue;
      const objectUrl = URL.createObjectURL(packed.blob);
      media.push({
        ...stub,
        blob: packed.blob,
        objectUrl,
        mime: packed.mime || stub.mime,
        name: packed.name || stub.name,
      });
    }
    db.close();
    return {
      savedAt: row.savedAt || Date.now(),
      project: {
        ...meta,
        media,
        duck: meta.duck || { enabled: false, amountDb: 12, attackMs: 80, releaseMs: 200 },
        schemaVersion: meta.schemaVersion || VIDEO_SCHEMA_VERSION,
        id: meta.id || crypto.randomUUID(),
      },
    };
  } catch {
    return null;
  }
}

export async function clearVideoSession() {
  try {
    const db = await openDb();
    await idbClear(db, VIDEO_IDB_STORE_PROJECT);
    await idbClear(db, VIDEO_IDB_STORE_MEDIA);
    db.close();
  } catch {
    // ignore
  }
}

export async function hasVideoSession() {
  const db = await openDb().catch(() => null);
  if (!db) return false;
  try {
    const row = await idbGet(db, VIDEO_IDB_STORE_PROJECT, VIDEO_IDB_PROJECT_KEY);
    db.close();
    return Boolean(row?.project);
  } catch {
    return false;
  }
}

function idbPut(db, store, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function idbDelete(db, store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbClear(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbGetAllKeys(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
