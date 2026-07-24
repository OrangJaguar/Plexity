import { describe, expect, it } from 'vitest';
import { normalizeSourceAnalysis } from '@/lib/tools/converter/source-analysis.js';

describe('source-analysis', () => {
  it('merges inspection and adapter analysis', () => {
    const analysis = normalizeSourceAnalysis({
      inspection: { ok: true, format: 'png', warnings: ['sig warn'] },
      adapterAnalysis: { width: 100, height: 50, hasAlpha: true },
    });

    expect(analysis.category).toBe('image');
    expect(analysis.format).toBe('png');
    expect(analysis.width).toBe(100);
    expect(analysis.hasAlpha).toBe(true);
    expect(analysis.warnings).toContain('sig warn');
  });

  it('infers video category from format', () => {
    const analysis = normalizeSourceAnalysis({
      adapterAnalysis: { format: 'mkv' },
    });
    expect(analysis.category).toBe('video');
    expect(analysis.format).toBe('mkv');
  });

  it('captures v2 analysis fields', () => {
    const analysis = normalizeSourceAnalysis({
      adapterAnalysis: {
        format: 'jpeg',
        category: 'image',
        hasGpsMetadata: true,
        hasMetadata: true,
        colorProfile: 'sRGB',
        corruptionSignals: ['truncated'],
        subtitleTracks: [{ type: 'sub', language: 'en' }],
      },
    });
    expect(analysis.hasGpsMetadata).toBe(true);
    expect(analysis.colorProfile).toBe('sRGB');
    expect(analysis.warnings).toContain('GPS_METADATA');
    expect(analysis.subtitleTracks).toHaveLength(1);
    expect(analysis.corruptionSignals).toContain('truncated');
  });
});
