import { describe, expect, it } from 'vitest';
import {
  CONVERTER_PRESETS,
  presetAppliesToSource,
  resolvePresetPlan,
} from '@/lib/tools/converter/converter-presets.js';
import { normalizeSourceAnalysis } from '@/lib/tools/converter/source-analysis.js';

describe('converter-presets', () => {
  it('defines versioned presets including V1 core set', () => {
    const ids = CONVERTER_PRESETS.map((p) => p.id);
    for (const id of [
      'change-format',
      'make-smaller',
      'best-quality',
      'web-optimized',
      'mobile-compatible',
      'extract-audio',
      'preserve-transparency',
      'lossless',
    ]) {
      expect(ids).toContain(id);
    }
    expect(ids.length).toBeGreaterThanOrEqual(8);
  });

  it('resolves make-smaller for images without upscaling', () => {
    const source = normalizeSourceAnalysis({
      adapterAnalysis: { format: 'png', width: 4000, height: 3000, category: 'image' },
    });
    const plan = resolvePresetPlan('make-smaller', source);
    expect(plan?.goalId).toBe('make-smaller');
    expect(plan?.options.maxWidth).toBeLessThanOrEqual(1920);
    expect(plan?.options.maxHeight).toBeLessThanOrEqual(1080);
  });

  it('resolves extract-audio for video sources', () => {
    const source = normalizeSourceAnalysis({
      adapterAnalysis: { format: 'mp4', category: 'video' },
    });
    const plan = resolvePresetPlan('extract-audio', source);
    expect(plan?.operationId).toBe('extract-audio-mp4');
  });

  it('lossless preset avoids lossy image ops', () => {
    const source = normalizeSourceAnalysis({
      adapterAnalysis: { format: 'jpeg', category: 'image' },
    });
    const plan = resolvePresetPlan('lossless', source);
    expect(plan?.operationId).toBe('jpeg-to-png');
    expect(plan?.warnings).not.toContain('LOSSY');
  });

  describe('presetAppliesToSource across all presets', () => {
    it('change-format applies whenever the input format has any operations', () => {
      expect(presetAppliesToSource('change-format', { format: 'png' }, { targetFormat: 'webp' })).toBe(true);
      expect(presetAppliesToSource('change-format', { format: 'not-a-real-format' })).toBe(false);
    });

    it('make-smaller applies to image, audio, and video but not data', () => {
      expect(presetAppliesToSource('make-smaller', { format: 'png', category: 'image' })).toBe(true);
      expect(presetAppliesToSource('make-smaller', { format: 'wav', category: 'audio' })).toBe(true);
      expect(presetAppliesToSource('make-smaller', { format: 'mp4', category: 'video' })).toBe(true);
      expect(presetAppliesToSource('make-smaller', { format: 'csv', category: 'data' })).toBe(false);
    });

    it('best-quality applies to image, audio, and video', () => {
      expect(presetAppliesToSource('best-quality', { format: 'jpeg', category: 'image' })).toBe(true);
      expect(presetAppliesToSource('best-quality', { format: 'wav', category: 'audio' })).toBe(true);
      expect(presetAppliesToSource('best-quality', { format: 'mp4', category: 'video' })).toBe(true);
      expect(presetAppliesToSource('best-quality', { format: 'csv', category: 'data' })).toBe(false);
    });

    it('web-optimized applies to image and video only', () => {
      expect(presetAppliesToSource('web-optimized', { format: 'png', category: 'image' })).toBe(true);
      expect(presetAppliesToSource('web-optimized', { format: 'mp4', category: 'video' })).toBe(true);
      expect(presetAppliesToSource('web-optimized', { format: 'wav', category: 'audio' })).toBe(false);
      expect(presetAppliesToSource('web-optimized', { format: 'csv', category: 'data' })).toBe(false);
    });

    it('mobile-compatible applies to image, video, and audio', () => {
      expect(presetAppliesToSource('mobile-compatible', { format: 'png', category: 'image' })).toBe(true);
      expect(presetAppliesToSource('mobile-compatible', { format: 'mp4', category: 'video' })).toBe(true);
      expect(presetAppliesToSource('mobile-compatible', { format: 'wav', category: 'audio' })).toBe(true);
      expect(presetAppliesToSource('mobile-compatible', { format: 'csv', category: 'data' })).toBe(false);
    });

    it('extract-audio applies only to video', () => {
      expect(presetAppliesToSource('extract-audio', { format: 'mp4', category: 'video' })).toBe(true);
      expect(presetAppliesToSource('extract-audio', { format: 'png', category: 'image' })).toBe(false);
      expect(presetAppliesToSource('extract-audio', { format: 'wav', category: 'audio' })).toBe(false);
    });

    it('preserve-transparency applies only to alpha-capable images', () => {
      expect(presetAppliesToSource('preserve-transparency', { format: 'png', category: 'image', hasAlpha: true })).toBe(true);
      expect(presetAppliesToSource('preserve-transparency', { format: 'png', category: 'image', hasAlpha: false })).toBe(false);
      expect(presetAppliesToSource('preserve-transparency', { format: 'mp4', category: 'video' })).toBe(false);
    });

    it('lossless applies to image, audio, video, and data with lossless output', () => {
      expect(presetAppliesToSource('lossless', { format: 'jpeg', category: 'image' })).toBe(true);
      expect(presetAppliesToSource('lossless', { format: 'wav', category: 'audio' })).toBe(true);
      expect(presetAppliesToSource('lossless', { format: 'mp4', category: 'video' })).toBe(true);
      expect(presetAppliesToSource('lossless', { format: 'csv', category: 'data' })).toBe(true);
    });

    it('returns false without a format or category', () => {
      expect(presetAppliesToSource('make-smaller', {})).toBe(false);
    });
  });
});
