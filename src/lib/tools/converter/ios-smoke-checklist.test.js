import { describe, expect, it } from 'vitest';
import { CONVERTER_IOS_SMOKE_CHECKLIST } from '@/lib/tools/converter/ios-smoke-checklist.js';

describe('ios-smoke-checklist', () => {
  it('is frozen with unique, well-formed entries', () => {
    expect(Object.isFrozen(CONVERTER_IOS_SMOKE_CHECKLIST)).toBe(true);
    const ids = CONVERTER_IOS_SMOKE_CHECKLIST.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const item of CONVERTER_IOS_SMOKE_CHECKLIST) {
      expect(Object.isFrozen(item)).toBe(true);
      expect(item.title).toBeTruthy();
      expect(item.steps).toBeTruthy();
    }
  });

  it('covers folder/clipboard fallbacks, FFmpeg lifecycle, ZIP thresholds, format matrix, and background limits', () => {
    const ids = new Set(CONVERTER_IOS_SMOKE_CHECKLIST.map((item) => item.id));
    expect(ids.has('folder-fallback')).toBe(true);
    expect(ids.has('clipboard-fallback')).toBe(true);
    expect(ids.has('ffmpeg-load-cancel-reload')).toBe(true);
    expect(ids.has('zip-thresholds')).toBe(true);
    expect(ids.has('format-matrix')).toBe(true);
    expect(ids.has('background-completion-unsupported')).toBe(true);
  });

  it('covers V2 advanced workspace smoke items', () => {
    const ids = new Set(CONVERTER_IOS_SMOKE_CHECKLIST.map((item) => item.id));
    expect(ids.has('v2-target-size')).toBe(true);
    expect(ids.has('v2-merge-split-admission')).toBe(true);
    expect(ids.has('v2-structure-zip')).toBe(true);
    expect(ids.has('v2-advanced-drawer')).toBe(true);
    expect(ids.has('v2-background-cancel')).toBe(true);
  });
});
