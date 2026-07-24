import { describe, expect, it } from 'vitest';
import {
  ADMISSION_ERROR,
  detectDeviceProfile,
  estimatePeakMemory,
  evaluateAdmission,
  evaluateV2Admission,
} from '@/lib/tools/converter/converter-limits.js';

describe('converter-limits', () => {
  it('detects iOS profile with stricter limits', () => {
    const profile = detectDeviceProfile({ isIOS: true, isMobile: true });
    expect(profile.isIOS).toBe(true);
    expect(profile.concurrency).toBe(1);
    expect(profile.maxMegapixels).toBe(16);
  });

  it('estimates peak memory by adapter', () => {
    expect(estimatePeakMemory('image', { sourceBytes: 1000, width: 100, height: 100 })).toBeGreaterThan(1000);
    expect(estimatePeakMemory('data', { sourceBytes: 1000, rowCount: 10 })).toBeGreaterThan(1000);
  });

  it('rejects oversized files on iOS profile', () => {
    const profile = detectDeviceProfile({ isIOS: true, isMobile: true });
    const result = evaluateAdmission({
      deviceProfile: profile,
      sourceBytes: profile.rejectSourceBytes + 1,
      adapter: 'image',
    });
    expect(result.admitted).toBe(false);
    expect(result.code).toBe(ADMISSION_ERROR.FILE_TOO_LARGE);
  });

  it('rejects excessive dimensions', () => {
    const profile = detectDeviceProfile({ isIOS: true, isMobile: true });
    const result = evaluateAdmission({
      deviceProfile: profile,
      sourceBytes: 1024,
      width: 9000,
      height: 9000,
      adapter: 'image',
    });
    expect(result.admitted).toBe(false);
    expect(result.code).toBe(ADMISSION_ERROR.DIMENSIONS_TOO_LARGE);
  });

  it('rejects when memory budget exceeded', () => {
    const profile = detectDeviceProfile({
      isIOS: true,
      peakMemoryBytes: 1000,
      maxMegapixels: 64,
      maxAxisPixels: 16384,
    });
    const result = evaluateAdmission({
      deviceProfile: profile,
      sourceBytes: 900,
      width: 2000,
      height: 2000,
      adapter: 'image',
    });
    expect(result.admitted).toBe(false);
    expect(result.code).toBe(ADMISSION_ERROR.MEMORY_BUDGET_EXCEEDED);
  });

  describe('evaluateV2Admission', () => {
    const desktop = detectDeviceProfile({ isMobile: false, peakMemoryBytes: 1024 * 1024 * 1024 });

    it('rejects merge input counts above 12', () => {
      const result = evaluateV2Admission({
        deviceProfile: desktop,
        sourceBytes: 1024,
        adapter: 'video',
        mergeInputCount: 13,
      });
      expect(result.admitted).toBe(false);
      expect(result.code).toBe(ADMISSION_ERROR.MERGE_INPUT_COUNT_EXCEEDED);
    });

    it('rejects split segment counts above 20', () => {
      const result = evaluateV2Admission({
        deviceProfile: desktop,
        sourceBytes: 1024,
        adapter: 'video',
        splitSegmentCount: 21,
      });
      expect(result.admitted).toBe(false);
      expect(result.code).toBe(ADMISSION_ERROR.SPLIT_SEGMENT_COUNT_EXCEEDED);
    });

    it('applies a 1.5x peak memory multiplier for two-pass jobs', () => {
      const profile = detectDeviceProfile({
        isMobile: false,
        peakMemoryBytes: 1000,
        maxMegapixels: 64,
        maxAxisPixels: 16384,
      });
      const result = evaluateV2Admission({
        deviceProfile: profile,
        sourceBytes: 900,
        width: 2000,
        height: 2000,
        adapter: 'image',
        twoPass: true,
      });
      expect(result.admitted).toBe(false);
      expect(result.code).toBe(ADMISSION_ERROR.MEMORY_BUDGET_EXCEEDED);
    });

    it('admits valid v2 jobs within limits', () => {
      const result = evaluateV2Admission({
        deviceProfile: desktop,
        sourceBytes: 1024,
        adapter: 'video',
        mergeInputCount: 4,
        splitSegmentCount: 5,
      });
      expect(result.admitted).toBe(true);
    });
  });
});
