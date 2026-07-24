import { describe, expect, it } from 'vitest';
import { evaluateAiBudget, sanitizeUsageRecord } from '@/lib/tools/converter/ai/ai-usage.js';
import { AI_ERROR_CODES, AI_QUOTAS, costUsdBucket, tokenBucket } from '@/lib/tools/converter/ai/ai-quotas.js';
import { assertSttLimits } from '@/lib/tools/converter/ai/stt-preprocess.js';

describe('ai budget and usage', () => {
  it('soft-warns near request/budget limits', () => {
    const soft = evaluateAiBudget({
      requestCount: Math.floor(AI_QUOTAS.maxRequestsPerAdminPerDay * 0.85),
      estimatedUsd: 1,
    });
    expect(soft.ok).toBe(true);
    expect(soft.softWarning).toBe(true);
  });

  it('hard-blocks over daily budget', () => {
    const hard = evaluateAiBudget({
      requestCount: AI_QUOTAS.maxRequestsPerAdminPerDay,
      estimatedUsd: 0,
    });
    expect(hard.ok).toBe(false);
    expect(hard.code).toBe(AI_ERROR_CODES.AI_BUDGET_EXCEEDED);
  });

  it('sanitizes usage to buckets only', () => {
    const row = sanitizeUsageRecord({
      action: 'assist.plan',
      provider: 'openai-compatible',
      outcome: 'success',
      inputTokens: 1200,
      outputTokens: 80,
      estimatedUsd: 0.05,
    });
    expect(row.inputTokenBucket).toBe(tokenBucket(1200));
    expect(row.costUsdBucket).toBe(costUsdBucket(0.05));
    expect(JSON.stringify(row)).not.toMatch(/sk-/);
  });

  it('enforces STT size and duration quotas', () => {
    expect(assertSttLimits({ byteLength: AI_QUOTAS.maxSttAudioBytes + 1 }).code)
      .toBe(AI_ERROR_CODES.AI_UPLOAD_TOO_LARGE);
    expect(assertSttLimits({
      byteLength: 100,
      durationSeconds: AI_QUOTAS.maxSttAudioSeconds + 1,
    }).code).toBe(AI_ERROR_CODES.AI_DURATION_LIMIT);
    expect(assertSttLimits({ byteLength: 100, durationSeconds: 10 }).ok).toBe(true);
  });
});
