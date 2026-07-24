import { describe, expect, it } from 'vitest';
import { planTargetSize } from '@/lib/tools/converter/target-size-planner.js';

describe('target-size-planner', () => {
  it('plans a video bitrate within clamps for a reasonable target', () => {
    const result = planTargetSize({
      category: 'video',
      durationSec: 60,
      sourceBytes: 100_000_000,
      targetBytes: 8_000_000,
    });
    expect(result).not.toBeNull();
    expect(result?.bitrateKbps).toBeGreaterThan(0);
    expect(result?.warnings).toContain('TARGET_SIZE_APPROX');
    expect(['low', 'medium', 'high']).toContain(result?.uncertainty);
  });

  it('never returns an exact-size guarantee — estimate always carries a warning', () => {
    const result = planTargetSize({
      category: 'audio',
      durationSec: 180,
      sourceBytes: 20_000_000,
      targetBytes: 3_000_000,
    });
    expect(result?.warnings).toContain('TARGET_SIZE_APPROX');
  });

  it('clamps audio bitrate to a sane minimum for tiny targets', () => {
    const result = planTargetSize({
      category: 'audio',
      durationSec: 3600,
      sourceBytes: 100_000_000,
      targetBytes: 1000,
    });
    expect(result?.bitrateKbps).toBeGreaterThanOrEqual(32);
  });

  it('clamps video bitrate to a sane maximum for huge targets', () => {
    const result = planTargetSize({
      category: 'video',
      durationSec: 1,
      sourceBytes: 100_000,
      targetBytes: 1_000_000_000,
    });
    expect(result?.bitrateKbps).toBeLessThanOrEqual(20000);
  });

  it('marks estimate high uncertainty when duration is missing', () => {
    const result = planTargetSize({
      category: 'video',
      durationSec: null,
      sourceBytes: 1_000_000,
      targetBytes: 500_000,
    });
    expect(result?.uncertainty).toBe('high');
    expect(result?.warnings).toContain('ESTIMATE_UNCERTAIN');
  });

  it('prefers two-pass when tolerance is tight and two-pass is allowed', () => {
    const result = planTargetSize({
      category: 'video',
      durationSec: 60,
      sourceBytes: 100_000_000,
      targetBytes: 8_000_000,
      toleranceRatio: 0.05,
      allowTwoPass: true,
    });
    expect(result?.passStrategy).toBe('two');
    expect(result?.warnings).toContain('TWO_PASS');
  });

  it('falls back to a single pass when two-pass is disallowed', () => {
    const result = planTargetSize({
      category: 'video',
      durationSec: 60,
      sourceBytes: 100_000_000,
      targetBytes: 8_000_000,
      toleranceRatio: 0.05,
      allowTwoPass: false,
    });
    expect(result?.passStrategy).toBe('one');
  });

  it('does not attempt bitrate math for non-time-based categories', () => {
    const result = planTargetSize({
      category: 'image',
      sourceBytes: 5_000_000,
      targetBytes: 500_000,
    });
    expect(result?.bitrateKbps).toBeNull();
    expect(result?.uncertainty).toBe('high');
  });
});
