import { describe, expect, it } from 'vitest';
import {
  createSplitSpec,
  estimateSplitCount,
  SPLIT_LIMITS,
  validateSplitSpec,
} from '@/lib/tools/converter/split-plan.js';

describe('split-plan', () => {
  it('creates a valid split spec', () => {
    const spec = createSplitSpec({ mode: 'duration', value: 60 });
    expect(spec).toEqual({ mode: 'duration', value: 60 });
    expect(Object.isFrozen(spec)).toBe(true);
  });

  it('rejects an invalid mode or non-positive value', () => {
    expect(createSplitSpec({ mode: 'bogus', value: 10 })).toBeNull();
    expect(createSplitSpec({ mode: 'count', value: 0 })).toBeNull();
    expect(createSplitSpec({ mode: 'count', value: -1 })).toBeNull();
  });

  it('estimates split count by duration', () => {
    const spec = createSplitSpec({ mode: 'duration', value: 30 });
    expect(estimateSplitCount(spec, { durationSec: 90 })).toBe(3);
  });

  it('estimates split count by size', () => {
    const spec = createSplitSpec({ mode: 'size', value: 1_000_000 });
    expect(estimateSplitCount(spec, { sourceBytes: 2_500_000 })).toBe(3);
  });

  it('estimates split count by fixed count', () => {
    const spec = createSplitSpec({ mode: 'count', value: 5 });
    expect(estimateSplitCount(spec, {})).toBe(5);
  });

  it('returns null when required context is missing', () => {
    const spec = createSplitSpec({ mode: 'duration', value: 30 });
    expect(estimateSplitCount(spec, {})).toBeNull();
  });

  it('validates a spec within the segment limit', () => {
    const spec = createSplitSpec({ mode: 'count', value: 10 });
    expect(validateSplitSpec(spec, {}).ok).toBe(true);
  });

  it('rejects a spec that exceeds SPLIT_LIMITS.maxSegments', () => {
    const spec = createSplitSpec({ mode: 'count', value: 25 });
    const result = validateSplitSpec(spec, {});
    expect(result.ok).toBe(false);
    expect(result.code).toBe('SPLIT_LIMIT_EXCEEDED');
  });

  it('exposes SPLIT_LIMITS.maxSegments as 20', () => {
    expect(SPLIT_LIMITS.maxSegments).toBe(20);
  });

  it('rejects a null/invalid spec', () => {
    expect(validateSplitSpec(null).ok).toBe(false);
  });
});
