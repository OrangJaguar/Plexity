/**
 * Budget / usage helpers (client-side mirrors of server accounting).
 */

import { AI_ERROR_CODES, AI_QUOTAS, costUsdBucket, tokenBucket } from './ai-quotas.js';

/**
 * @param {{ requestCount: number, estimatedUsd: number }} usage
 */
export function evaluateAiBudget(usage) {
  const requests = Number(usage.requestCount) || 0;
  const usd = Number(usage.estimatedUsd) || 0;
  if (requests >= AI_QUOTAS.maxRequestsPerAdminPerDay || usd >= AI_QUOTAS.hardBudgetUsd) {
    return {
      ok: false,
      code: AI_ERROR_CODES.AI_BUDGET_EXCEEDED,
      softWarning: false,
      remainingRequests: 0,
    };
  }
  const softWarning = usd >= AI_QUOTAS.softBudgetUsd
    || requests >= Math.floor(AI_QUOTAS.maxRequestsPerAdminPerDay * 0.8);
  return {
    ok: true,
    code: null,
    softWarning,
    remainingRequests: Math.max(0, AI_QUOTAS.maxRequestsPerAdminPerDay - requests),
  };
}

/**
 * @param {{ inputTokens?: number, outputTokens?: number, estimatedUsd?: number, action: string, provider: string, outcome: string }} entry
 */
export function sanitizeUsageRecord(entry) {
  return Object.freeze({
    action: String(entry.action || '').slice(0, 64),
    provider: String(entry.provider || '').slice(0, 32),
    outcome: entry.outcome === 'success' || entry.outcome === 'fail' || entry.outcome === 'cancel'
      ? entry.outcome
      : 'fail',
    inputTokenBucket: tokenBucket(entry.inputTokens),
    outputTokenBucket: tokenBucket(entry.outputTokens),
    costUsdBucket: costUsdBucket(entry.estimatedUsd),
  });
}
