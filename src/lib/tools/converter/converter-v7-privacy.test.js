import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeTelemetryProps } from '@/lib/tools/converter/converter-privacy.js';
import { sanitizeUsageRecord } from '@/lib/tools/converter/ai/ai-usage.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('Plan 7 privacy and kill-switch regressions', () => {
  it('documents AI kill switches and deploy order', () => {
    const docs = readFileSync(path.join(root, 'docs/admin-converter-ai.md'), 'utf8');
    expect(docs).toMatch(/ENABLE_AI_PROVIDER/);
    expect(docs).toMatch(/ACCEPT_NEW_AI_JOBS/);
    expect(docs).toMatch(/converter\.ai\.assist/);
    expect(docs).toMatch(/Deploy order/i);
    expect(docs).toMatch(/Rollback/i);
  });

  it('AI UI discloses temporary cloud processing and never brands as free unlimited AI', () => {
    const assist = readFileSync(
      path.join(root, 'src/components/tools/converter/ConverterAiAssistPanel.jsx'),
      'utf8',
    );
    expect(assist).toMatch(/temporary cloud/i);
    expect(assist).not.toMatch(/unlimited/i);
    expect(assist).not.toMatch(/sk-[a-zA-Z0-9]/);
  });

  it('telemetry drops prompts, URLs, filenames, and keys', () => {
    const safe = sanitizeTelemetryProps({
      aiAction: 'assist.plan',
      provider: 'openai-compatible',
      tokenBucket: 'lt500',
      costUsdBucket: 'lt1c',
      prompt: 'secret prompt text',
      url: 'https://example.com/x',
      filename: 'secret.mp4',
      apiKey: 'sk-test',
    });
    expect(safe.aiAction).toBe('assist.plan');
    expect(safe.provider).toBe('openai-compatible');
    expect(safe.prompt).toBeUndefined();
    expect(safe.url).toBeUndefined();
    expect(safe.filename).toBeUndefined();
    expect(safe.apiKey).toBeUndefined();
  });

  it('usage sanitization never includes raw token counts or secrets', () => {
    const row = sanitizeUsageRecord({
      action: 'ocr.run',
      provider: 'anthropic',
      outcome: 'success',
      inputTokens: 9999,
      estimatedUsd: 2,
    });
    const json = JSON.stringify(row);
    expect(json).not.toContain('9999');
    expect(json).not.toMatch(/sk-/);
  });

  it('media service AI worker and providers exist', () => {
    expect(existsSync(path.join(root, 'services/converter-media/src/workers/ai-worker.js'))).toBe(true);
    expect(existsSync(path.join(root, 'services/converter-media/src/ai-providers.js'))).toBe(true);
  });
});
