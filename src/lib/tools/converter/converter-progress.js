export const PHASE_WEIGHTS = Object.freeze({
  analyzing: 0.12,
  queued: 0.03,
  processing: 0.85,
});

/**
 * @param {number} value
 * @param {number} [min=0]
 * @param {number} [max=1]
 * @returns {number}
 */
export function clampProgress(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {number} previous
 * @param {number} next
 * @returns {number}
 */
export function applyMonotonicProgress(previous, next) {
  const clamped = clampProgress(next);
  const prev = clampProgress(previous);
  return Math.max(prev, clamped);
}

/**
 * @param {import('./converter-job-model.js').ConverterJob | { status: string, progress?: { phase?: string | null, fraction?: number } }} job
 * @returns {number}
 */
export function jobProgressFraction(job) {
  const status = job.status;
  if (status === 'completed') return 1;
  if (status === 'failed' || status === 'cancelled') return 0;
  if (status === 'waiting') return 0;

  const phase = job.progress?.phase;
  const fraction = clampProgress(job.progress?.fraction ?? 0);

  if (phase === 'analyzing') {
    return fraction * PHASE_WEIGHTS.analyzing;
  }
  if (phase === 'queued') {
    return PHASE_WEIGHTS.analyzing + fraction * PHASE_WEIGHTS.queued;
  }
  if (phase === 'processing') {
    return PHASE_WEIGHTS.analyzing + PHASE_WEIGHTS.queued + fraction * PHASE_WEIGHTS.processing;
  }

  if (status === 'analyzing') return fraction * PHASE_WEIGHTS.analyzing;
  if (status === 'queued') return PHASE_WEIGHTS.analyzing + fraction * PHASE_WEIGHTS.queued;
  if (status === 'processing') {
    return PHASE_WEIGHTS.analyzing + PHASE_WEIGHTS.queued + fraction * PHASE_WEIGHTS.processing;
  }

  return 0;
}

/**
 * @param {ReadonlyArray<import('./converter-job-model.js').ConverterJob>} jobs
 * @returns {number}
 */
export function overallQueueProgress(jobs) {
  if (!jobs.length) return 0;
  const sum = jobs.reduce((acc, job) => acc + jobProgressFraction(job), 0);
  return clampProgress(sum / jobs.length);
}
