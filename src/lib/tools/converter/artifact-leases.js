/**
 * Ref-counted leases that stop artifact store cleanup from deleting a key
 * while something still needs it (e.g. a live object URL or an in-flight
 * package build reading the blob).
 */

/**
 * @typedef {object} ArtifactLeaseManager
 * @property {(key: string) => void} acquire
 * @property {(key: string) => void} release
 * @property {(key: string) => boolean} isLeased
 * @property {() => void} disposeAll
 */

/**
 * @returns {ArtifactLeaseManager}
 */
export function createArtifactLeaseManager() {
  /** @type {Map<string, number>} */
  const counts = new Map();

  return {
    /**
     * @param {string} key
     */
    acquire(key) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    },

    /**
     * @param {string} key
     */
    release(key) {
      const next = (counts.get(key) ?? 0) - 1;
      if (next <= 0) {
        counts.delete(key);
      } else {
        counts.set(key, next);
      }
    },

    /**
     * @param {string} key
     * @returns {boolean}
     */
    isLeased(key) {
      return (counts.get(key) ?? 0) > 0;
    },

    disposeAll() {
      counts.clear();
    },
  };
}

/**
 * Delete a key from the store unless it is currently leased.
 * @param {import('./artifact-store.js').ArtifactStore} store
 * @param {ArtifactLeaseManager} leases
 * @param {string} key
 * @returns {Promise<boolean>} true when the key was deleted
 */
export async function safeDelete(store, leases, key) {
  if (leases.isLeased(key)) return false;
  await store.delete(key);
  return true;
}
