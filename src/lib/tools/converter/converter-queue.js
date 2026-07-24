/** @typedef {'waiting' | 'running' | 'cancelled'} QueueItemState */

/**
 * @typedef {object} QueueJobHandle
 * @property {() => void} cancel
 * @property {() => void} dispose
 */

/**
 * @typedef {object} ConverterQueueOptions
 * @property {number} [concurrency] Concurrency for the implicit single lane (ignored when `lanes` is set).
 * @property {Record<string, number>} [lanes] Named lanes with independent FIFO queues and concurrency, e.g. `{ native: 2, ffmpeg: 1 }`.
 * @property {(jobId: string, attemptId: string, lane: string) => Promise<QueueJobHandle>} onJobStart
 * @property {(jobId: string, attemptId: string, error: unknown) => void} [onJobError]
 * @property {(jobId: string, attemptId: string, result: unknown) => void} [onJobComplete]
 */

/**
 * @typedef {object} QueueItem
 * @property {string} jobId
 * @property {string} attemptId
 * @property {QueueItemState} state
 */

/**
 * @typedef {object} LaneState
 * @property {number} concurrency
 * @property {QueueItem[]} queue
 * @property {Map<string, { jobId: string, attemptId: string, handle: QueueJobHandle | null }>} active
 */

/**
 * @param {string} jobId
 * @param {string} attemptId
 * @returns {string}
 */
function itemKey(jobId, attemptId) {
  return `${jobId}:${attemptId}`;
}

/**
 * @param {number} concurrency
 * @returns {LaneState}
 */
function createLaneState(concurrency) {
  return { concurrency: Math.max(1, concurrency), queue: [], active: new Map() };
}

/**
 * @param {ConverterQueueOptions} options
 * @returns {Record<string, number>}
 */
function normalizeLaneConfigs(options) {
  const entries = options.lanes ? Object.entries(options.lanes) : [];
  if (entries.length > 0) {
    /** @type {Record<string, number>} */
    const config = {};
    for (const [name, concurrency] of entries) {
      config[name] = Math.max(1, Number(concurrency) || 1);
    }
    return config;
  }
  return { default: Math.max(1, options.concurrency ?? 1) };
}

/**
 * FIFO scheduler with configurable concurrency, optionally split across
 * independent named lanes (e.g. a `native` lane and a serialized `ffmpeg`
 * lane). A failure in one lane never blocks or cancels another lane.
 */
export function createConverterQueue(options) {
  const laneConfigs = normalizeLaneConfigs(options);
  const defaultLane = Object.keys(laneConfigs)[0];

  /** @type {Map<string, LaneState>} */
  const lanes = new Map(
    Object.entries(laneConfigs).map(([name, concurrency]) => [name, createLaneState(concurrency)]),
  );
  let disposed = false;

  /**
   * @param {string} name
   * @returns {LaneState}
   */
  function laneFor(name) {
    return lanes.get(name) ?? lanes.get(defaultLane);
  }

  /**
   * @param {string} jobId
   * @param {string} attemptId
   * @returns {string | null}
   */
  function findActiveLane(jobId, attemptId) {
    const key = itemKey(jobId, attemptId);
    for (const [name, lane] of lanes.entries()) {
      if (lane.active.has(key)) return name;
    }
    return null;
  }

  /**
   * @param {string} laneName
   */
  function pump(laneName) {
    if (disposed) return;
    const lane = laneFor(laneName);
    while (lane.active.size < lane.concurrency) {
      const next = lane.queue.find((item) => item.state === 'waiting');
      if (!next) break;

      next.state = 'running';
      const key = itemKey(next.jobId, next.attemptId);
      lane.active.set(key, { jobId: next.jobId, attemptId: next.attemptId, handle: null });

      Promise.resolve(options.onJobStart(next.jobId, next.attemptId, laneName))
        .then((handle) => {
          const entry = lane.active.get(key);
          if (!entry) {
            handle?.dispose?.();
            return;
          }
          entry.handle = handle;
        })
        .catch((error) => {
          lane.active.delete(key);
          options.onJobError?.(next.jobId, next.attemptId, error);
          pump(laneName);
        });
    }
  }

  return {
    /**
     * @param {string} jobId
     * @param {string} attemptId
     * @param {string} [lane]
     */
    enqueue(jobId, attemptId, lane = defaultLane) {
      if (disposed) return;
      const laneState = laneFor(lane);
      const exists = laneState.queue.some(
        (item) => item.jobId === jobId && item.attemptId === attemptId && item.state !== 'cancelled',
      );
      if (exists) return;
      laneState.queue.push({ jobId, attemptId, state: 'waiting' });
      pump(lane);
    },

    /**
     * Cancel queued item (prevent start) or active job, across all lanes.
     * @param {string} jobId
     * @param {string} [attemptId]
     */
    cancel(jobId, attemptId) {
      for (const lane of lanes.values()) {
        for (const item of lane.queue) {
          if (item.jobId === jobId && (!attemptId || item.attemptId === attemptId) && item.state === 'waiting') {
            item.state = 'cancelled';
          }
        }

        for (const [key, entry] of lane.active.entries()) {
          if (entry.jobId === jobId && (!attemptId || entry.attemptId === attemptId)) {
            entry.handle?.cancel?.();
            lane.active.delete(key);
          }
        }
      }
    },

    /**
     * Retry as new attempt — caller should update reducer then enqueue new attemptId.
     * @param {string} jobId
     * @param {string} attemptId
     * @param {string} [lane]
     */
    retry(jobId, attemptId, lane) {
      this.enqueue(jobId, attemptId, lane ?? defaultLane);
    },

    /**
     * @param {string} jobId
     * @param {string} attemptId
     * @param {unknown} [result]
     */
    complete(jobId, attemptId, result) {
      const laneName = findActiveLane(jobId, attemptId) ?? defaultLane;
      const lane = laneFor(laneName);
      const key = itemKey(jobId, attemptId);
      const entry = lane.active.get(key);
      if (entry) {
        // Completion must not dispose output artifacts / object URLs.
        // Only release the active slot and any ephemeral worker handle resources.
        entry.handle?.releaseWorker?.();
        lane.active.delete(key);
      }
      options.onJobComplete?.(jobId, attemptId, result);
      pump(laneName);
    },

    /**
     * @param {string} jobId
     * @param {string} attemptId
     * @param {unknown} error
     */
    fail(jobId, attemptId, error) {
      const laneName = findActiveLane(jobId, attemptId) ?? defaultLane;
      const lane = laneFor(laneName);
      const key = itemKey(jobId, attemptId);
      const entry = lane.active.get(key);
      if (entry) {
        entry.handle?.cancel?.();
        entry.handle?.dispose?.();
        lane.active.delete(key);
      }
      options.onJobError?.(jobId, attemptId, error);
      pump(laneName);
    },

    /**
     * @param {string} [lane]
     */
    getPendingCount(lane) {
      if (lane) return laneFor(lane).queue.filter((item) => item.state === 'waiting').length;
      let total = 0;
      for (const l of lanes.values()) total += l.queue.filter((item) => item.state === 'waiting').length;
      return total;
    },

    /**
     * @param {string} [lane]
     */
    getActiveCount(lane) {
      if (lane) return laneFor(lane).active.size;
      let total = 0;
      for (const l of lanes.values()) total += l.active.size;
      return total;
    },

    dispose() {
      disposed = true;
      for (const lane of lanes.values()) {
        for (const entry of lane.active.values()) {
          entry.handle?.cancel?.();
          entry.handle?.dispose?.();
        }
        lane.active.clear();
        lane.queue.length = 0;
      }
    },
  };
}
