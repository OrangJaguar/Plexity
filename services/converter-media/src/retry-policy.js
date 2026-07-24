/** Retry policy for fetch/transcode attempts. */

export const MAX_ATTEMPTS = 3;

const RETRYABLE = new Set([
  'FETCH_TIMEOUT',
  'FETCH_NETWORK',
  'FETCH_UPSTREAM_5XX',
  'PROCESS_TIMEOUT',
  'LEASE_LOST',
  'WORKER_RESTART',
]);

export function isRetryable(errorCode) {
  return RETRYABLE.has(errorCode);
}

export function shouldRetry(attemptNumber, errorCode) {
  if (attemptNumber >= MAX_ATTEMPTS) return false;
  return isRetryable(errorCode);
}

export function backoffMs(attemptNumber) {
  const base = 2000;
  return Math.min(base * 2 ** (attemptNumber - 1), 60_000);
}
