import { describe, expect, it } from 'vitest';
import {
  normalizeAiPlanDraft,
  normalizeAiRecipeDraft,
} from '@/lib/tools/converter/ai/plan-from-llm.js';
import { AI_ERROR_CODES } from '@/lib/tools/converter/ai/ai-quotas.js';

describe('plan-from-llm', () => {
  it('accepts allowlisted operation plans', () => {
    const result = normalizeAiPlanDraft({
      plan: { operationId: 'audio-to-mp3', options: { bitrate: 128 }, goalId: 'podcast' },
      explanation: 'ok',
      warnings: ['note'],
    });
    expect(result.ok).toBe(true);
    expect(result.plan.operationId).toBe('audio-to-mp3');
  });

  it('rejects argv escape hatches', () => {
    expect(normalizeAiPlanDraft({
      plan: { operationId: 'video-to-mp4', argv: ['-y'] },
    }).ok).toBe(false);
    expect(normalizeAiPlanDraft({
      plan: { operationId: 'video-to-mp4', options: { ffmpegArgs: ['x'] } },
    }).ok).toBe(true);
    expect(normalizeAiPlanDraft({
      plan: { operationId: 'video-to-mp4', options: { ffmpegArgs: ['x'] } },
    }).plan.options.ffmpegArgs).toBeUndefined();
  });

  it('rejects unknown operations', () => {
    const result = normalizeAiPlanDraft({ plan: { operationId: 'shell-rm-rf' } });
    expect(result.ok).toBe(false);
  });

  it('normalizes recipe drafts through converter-recipe.v1', () => {
    const result = normalizeAiRecipeDraft({
      recipe: {
        id: 'ai-test',
        planTemplate: { operationId: 'image-to-webp', options: {} },
      },
    });
    expect(result.ok).toBe(true);
    expect(result.recipe.planTemplate.operationId).toBe('image-to-webp');
  });

  it('rejects invalid recipe JSON', () => {
    expect(normalizeAiRecipeDraft('not-json').code).toBe(AI_ERROR_CODES.AI_VALIDATION_FAILED);
  });
});
