import { describe, expect, it } from 'vitest';
import {
  assertOcrSize,
  normalizeOcrResult,
  inferTableSchema,
  suggestJsonRepair,
  normalizeAltText,
} from '@/lib/tools/converter/ai/ocr-normalize.js';
import { suggestCsvRepair } from '@/lib/tools/converter/ai/schema-repair.js';
import { suggestChaptersFromTimestamps } from '@/lib/tools/converter/ai/scene-chapter.js';
import { AI_ERROR_CODES, AI_QUOTAS } from '@/lib/tools/converter/ai/ai-quotas.js';

describe('ocr-normalize and schema repair', () => {
  it('rejects oversized OCR uploads', () => {
    expect(assertOcrSize(AI_QUOTAS.maxOcrImageBytes + 1).code).toBe(AI_ERROR_CODES.AI_UPLOAD_TOO_LARGE);
    expect(assertOcrSize(100).ok).toBe(true);
  });

  it('normalizes OCR with low-confidence warning', () => {
    const result = normalizeOcrResult({ text: 'hi', confidence: 0.2 });
    expect(result.warnings).toContain('LOW_OCR_CONFIDENCE');
    expect(result.markdown).toBe('hi');
  });

  it('infers schema from object rows', () => {
    const schema = inferTableSchema([{ name: 'a', age: '1' }]);
    expect(schema.ok).toBe(true);
    expect(schema.schema.properties.name).toEqual({ type: 'string' });
  });

  it('suggests JSON repair drafts', () => {
    const fixed = suggestJsonRepair('{"a":1,}');
    expect(fixed.ok).toBe(true);
    expect(fixed.repaired).toBe(true);
  });

  it('suggests CSV repair drafts', () => {
    const fixed = suggestCsvRepair('a,b\n1');
    expect(fixed.ok).toBe(true);
    expect(fixed.draft.split('\n')[1]).toBe('1,');
  });

  it('builds scene chapter drafts without auto-apply', () => {
    const draft = suggestChaptersFromTimestamps([0, 10, 20]);
    expect(draft.autoApply).toBe(false);
    expect(draft.requiresConfirm).toBe(true);
    expect(draft.chapters).toHaveLength(3);
  });

  it('normalizes alt text length', () => {
    expect(normalizeAltText('  hello   world  ')).toBe('hello world');
  });
});
