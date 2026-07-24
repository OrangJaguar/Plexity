/**
 * Shared AI error codes and quotas for Plan 7 (client + mirrored server-side).
 */

export const AI_ERROR_CODES = Object.freeze({
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  AI_DISABLED: 'AI_DISABLED',
  AI_BUDGET_EXCEEDED: 'AI_BUDGET_EXCEEDED',
  AI_PROVIDER_ERROR: 'AI_PROVIDER_ERROR',
  AI_VALIDATION_FAILED: 'AI_VALIDATION_FAILED',
  AI_INJECTION_REJECTED: 'AI_INJECTION_REJECTED',
  AI_UPLOAD_TOO_LARGE: 'AI_UPLOAD_TOO_LARGE',
  AI_DURATION_LIMIT: 'AI_DURATION_LIMIT',
  AI_CANCELLED: 'AI_CANCELLED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_CONFIRM_REQUIRED: 'AI_CONFIRM_REQUIRED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
});

export const AI_QUOTAS = Object.freeze({
  maxRequestsPerAdminPerDay: 20,
  maxConcurrentAiJobsPerAdmin: 5,
  maxOcrImageBytes: 25 * 1024 * 1024,
  maxSttAudioBytes: 100 * 1024 * 1024,
  maxSttAudioSeconds: 30 * 60,
  maxSttVideoBytes: 500 * 1024 * 1024,
  maxSttVideoSeconds: 2 * 60 * 60,
  maxPromptChars: 8000,
  maxCompletionChars: 4000,
  /** Soft daily USD budget bucket threshold (advisory). */
  softBudgetUsd: 5,
  /** Hard daily USD budget — block new AI calls. */
  hardBudgetUsd: 15,
  tempRetentionMs: 15 * 60 * 1000,
});

export const AI_ACTIONS = Object.freeze([
  'assist.plan',
  'assist.summary',
  'assist.naming',
  'assist.compress',
  'ocr.run',
  'ocr.table',
  'ocr.schema',
  'ocr.altText',
  'transcribe.run',
  'transcribe.translate',
  'subtitle.generate',
]);

export const AI_PROVIDERS = Object.freeze(['openai-compatible', 'anthropic']);

/**
 * @param {number} tokens
 * @returns {string}
 */
export function tokenBucket(tokens) {
  const n = Number(tokens) || 0;
  if (n <= 0) return '0';
  if (n < 500) return 'lt500';
  if (n < 2000) return '500to2k';
  if (n < 8000) return '2kto8k';
  return 'gte8k';
}

/**
 * @param {number} usd
 * @returns {string}
 */
export function costUsdBucket(usd) {
  const n = Number(usd) || 0;
  if (n <= 0) return '0';
  if (n < 0.01) return 'lt1c';
  if (n < 0.1) return '1cto10c';
  if (n < 1) return '10cto1';
  return 'gte1';
}
