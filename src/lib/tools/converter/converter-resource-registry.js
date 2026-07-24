/**
 * Track object URLs, workers, abort controllers, bitmaps, artifacts by job/attempt.
 */
export function createConverterResourceRegistry() {
  /** @type {Map<string, { objectUrls: Set<string>, workers: Set<Worker>, abortControllers: Set<AbortController>, bitmaps: Set<ImageBitmap>, artifactKeys: Set<string> }>} */
  const byAttempt = new Map();

  /**
   * @param {string} jobId
   * @param {string} attemptId
   */
  function key(jobId, attemptId) {
    return `${jobId}:${attemptId}`;
  }

  /**
   * @param {string} jobId
   * @param {string} attemptId
   */
  function ensure(jobId, attemptId) {
    const k = key(jobId, attemptId);
    if (!byAttempt.has(k)) {
      byAttempt.set(k, {
        objectUrls: new Set(),
        workers: new Set(),
        abortControllers: new Set(),
        bitmaps: new Set(),
        artifactKeys: new Set(),
      });
    }
    return byAttempt.get(k);
  }

  return {
    /**
     * @param {string} jobId
     * @param {string} attemptId
     * @param {string} url
     * @returns {string}
     */
    registerObjectUrl(jobId, attemptId, url) {
      const entry = ensure(jobId, attemptId);
      const existing = [...entry.objectUrls];
      for (const old of existing) {
        if (old !== url) {
          URL.revokeObjectURL(old);
          entry.objectUrls.delete(old);
        }
      }
      entry.objectUrls.add(url);
      return url;
    },

    registerWorker(jobId, attemptId, worker) {
      ensure(jobId, attemptId).workers.add(worker);
    },

    registerAbortController(jobId, attemptId, controller) {
      ensure(jobId, attemptId).abortControllers.add(controller);
    },

    registerBitmap(jobId, attemptId, bitmap) {
      ensure(jobId, attemptId).bitmaps.add(bitmap);
    },

    registerArtifactKey(jobId, attemptId, artifactKey) {
      ensure(jobId, attemptId).artifactKeys.add(artifactKey);
    },

    /**
     * @param {string} jobId
     * @param {string} attemptId
     * @returns {Readonly<{ objectUrls: string[], workers: Worker[], abortControllers: AbortController[], bitmaps: ImageBitmap[], artifactKeys: string[] }>}
     */
    snapshot(jobId, attemptId) {
      const entry = byAttempt.get(key(jobId, attemptId));
      if (!entry) {
        return { objectUrls: [], workers: [], abortControllers: [], bitmaps: [], artifactKeys: [] };
      }
      return {
        objectUrls: [...entry.objectUrls],
        workers: [...entry.workers],
        abortControllers: [...entry.abortControllers],
        bitmaps: [...entry.bitmaps],
        artifactKeys: [...entry.artifactKeys],
      };
    },

    /**
     * Release workers/abort controllers without revoking output object URLs or forgetting artifact keys.
     * @param {string} jobId
     * @param {string} attemptId
     */
    releaseWorkersAndControllers(jobId, attemptId) {
      const entry = byAttempt.get(key(jobId, attemptId));
      if (!entry) return;
      for (const worker of entry.workers) worker.terminate();
      entry.workers.clear();
      for (const controller of entry.abortControllers) controller.abort();
      entry.abortControllers.clear();
      for (const bitmap of entry.bitmaps) bitmap.close?.();
      entry.bitmaps.clear();
    },

    /**
     * Idempotent dispose for a job attempt.
     * @param {string} jobId
     * @param {string} attemptId
     */
    disposeAttempt(jobId, attemptId) {
      const k = key(jobId, attemptId);
      const entry = byAttempt.get(k);
      if (!entry) return;

      for (const url of entry.objectUrls) URL.revokeObjectURL(url);
      for (const worker of entry.workers) worker.terminate();
      for (const controller of entry.abortControllers) controller.abort();
      for (const bitmap of entry.bitmaps) bitmap.close?.();

      byAttempt.delete(k);
    },

    disposeAll() {
      for (const k of [...byAttempt.keys()]) {
        const [jobId, attemptId] = k.split(':');
        this.disposeAttempt(jobId, attemptId);
      }
    },
  };
}
