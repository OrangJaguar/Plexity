import { describe, expect, it } from 'vitest';
import { createMergePlan, MERGE_SUPPORTED_CATEGORIES, validateMergeCompatibility } from '@/lib/tools/converter/merge-plan.js';

describe('merge-plan', () => {
  it('rejects merging fewer than two sources', () => {
    const result = validateMergeCompatibility([{ category: 'audio' }]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('TOO_FEW_SOURCES');
  });

  it('rejects merging sources with mismatched categories', () => {
    const result = validateMergeCompatibility([{ category: 'audio' }, { category: 'video' }]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('CATEGORY_MISMATCH');
  });

  it('rejects merging unsupported categories', () => {
    const result = validateMergeCompatibility([{ category: 'image' }, { category: 'image' }]);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('UNSUPPORTED_CATEGORY');
  });

  it('accepts compatible same-category sources', () => {
    const result = validateMergeCompatibility([{ category: 'audio' }, { category: 'audio' }]);
    expect(result.ok).toBe(true);
  });

  it('exposes supported merge categories', () => {
    expect(MERGE_SUPPORTED_CATEGORIES).toContain('audio');
    expect(MERGE_SUPPORTED_CATEGORIES).toContain('video');
  });

  it('creates a merge plan with a group id and frozen plan', () => {
    const result = createMergePlan({ sourceJobIds: ['job-1', 'job-2'], category: 'audio', outputFormat: 'mp3' });
    expect(result?.mergeGroupId).toMatch(/^merge-/);
    expect(result?.sourceJobIds).toEqual(['job-1', 'job-2']);
    expect(result?.plan.mergeGroupId).toBe(result?.mergeGroupId);
    expect(Object.isFrozen(result?.plan)).toBe(true);
    expect(result?.plan.warnings).toContain('MERGE_LOSSY');
  });

  it('returns null for an invalid merge plan request', () => {
    expect(createMergePlan({ sourceJobIds: ['only-one'], category: 'audio', outputFormat: 'mp3' })).toBeNull();
    expect(createMergePlan({ sourceJobIds: ['a', 'b'], category: 'image', outputFormat: 'png' })).toBeNull();
  });
});
