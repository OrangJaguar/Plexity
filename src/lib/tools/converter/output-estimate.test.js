import { describe, expect, it } from 'vitest';
import {
  estimateOutputSize,
  sizeBiasToFactor,
} from '@/lib/tools/converter/output-estimate.js';

describe('output-estimate', () => {
  it('centers sizeBias 0 near the original size', () => {
    const result = estimateOutputSize({
      category: 'video',
      sourceBytes: 237_000_000,
      durationSec: 120,
      sizeBias: 0,
      options: { sizeBias: 0 },
    });
    expect(result.bytes).toBeGreaterThan(237_000_000 * 0.95);
    expect(result.bytes).toBeLessThan(237_000_000 * 1.05);
  });

  it('makes max bias larger than the original', () => {
    const result = estimateOutputSize({
      category: 'image',
      sourceBytes: 1_000_000,
      operation: 'png-to-jpeg',
      options: { sizeBias: 1 },
      sizeBias: 1,
    });
    expect(result.bytes).toBeGreaterThan(1_000_000);
  });

  it('makes min bias smaller than the original', () => {
    const result = estimateOutputSize({
      category: 'image',
      sourceBytes: 1_000_000,
      operation: 'png-to-webp',
      options: { sizeBias: -1 },
      sizeBias: -1,
    });
    expect(result.bytes).toBeLessThan(400_000);
  });

  it('maps sizeBias factors symmetrically around 1', () => {
    expect(sizeBiasToFactor(0)).toBe(1);
    expect(sizeBiasToFactor(-1)).toBeCloseTo(0.25);
    expect(sizeBiasToFactor(1)).toBe(2);
  });

  it('estimates video from bitrate when sizeBias is absent (legacy)', () => {
    const result = estimateOutputSize({
      category: 'video',
      sourceBytes: 100_000_000,
      durationSec: 60,
      options: { videoBitrateKbps: 2500, audioBitrateKbps: 128 },
    });
    expect(result.uncertainty).toBe('low');
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('never returns negative bytes', () => {
    const result = estimateOutputSize({ category: 'video', sourceBytes: 0, durationSec: 10 });
    expect(result.bytes).toBeGreaterThanOrEqual(0);
  });

  it('resolves operation by id string', () => {
    const result = estimateOutputSize({
      category: 'image',
      sourceBytes: 1_000_000,
      operation: 'png-to-jpeg',
      options: { sizeBias: 0 },
    });
    expect(result.bytes).toBeGreaterThan(0);
  });

  it('clamps savingsRatio between -1 and 1', () => {
    const result = estimateOutputSize({
      category: 'data',
      sourceBytes: 100,
      operation: 'csv-to-json',
      options: { sizeBias: 1 },
    });
    expect(result.savingsRatio).toBeGreaterThanOrEqual(-1);
    expect(result.savingsRatio).toBeLessThanOrEqual(1);
  });
});
