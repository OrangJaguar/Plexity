export const ADMISSION_ERROR = Object.freeze({
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  DIMENSIONS_TOO_LARGE: 'DIMENSIONS_TOO_LARGE',
  MEMORY_BUDGET_EXCEEDED: 'MEMORY_BUDGET_EXCEEDED',
  MERGE_INPUT_COUNT_EXCEEDED: 'MERGE_INPUT_COUNT_EXCEEDED',
  SPLIT_SEGMENT_COUNT_EXCEEDED: 'SPLIT_SEGMENT_COUNT_EXCEEDED',
});

/** @typedef {ReturnType<typeof detectDeviceProfile>} DeviceProfile */

const IOS_UA = /iPad|iPhone|iPod/i;
const MOBILE_UA = /Android|webOS|Mobile/i;

/**
 * @param {object} [overrides]
 * @returns {DeviceProfile}
 */
export function detectDeviceProfile(overrides = {}) {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = overrides.isIOS ?? IOS_UA.test(ua);
  const isMobile = overrides.isMobile ?? (isIOS || MOBILE_UA.test(ua));

  const hasWorkers = overrides.hasWorkers ?? (typeof Worker !== 'undefined');
  const hasOffscreenCanvas = overrides.hasOffscreenCanvas ?? (typeof OffscreenCanvas !== 'undefined');
  const hasCreateImageBitmap = overrides.hasCreateImageBitmap ?? (typeof createImageBitmap !== 'undefined');
  const hasCanvas = overrides.hasCanvas ?? (
    typeof document !== 'undefined' && typeof document.createElement === 'function'
  );
  const hasOpfs = overrides.hasOpfs ?? Boolean(typeof navigator !== 'undefined' && navigator.storage?.getDirectory);
  const hasVideoEncoder = overrides.hasVideoEncoder ?? (typeof VideoEncoder !== 'undefined');
  const coarsePointer = overrides.coarsePointer ?? (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
  );

  return Object.freeze({
    isIOS,
    isMobile,
    hasWorkers,
    hasOffscreenCanvas,
    hasCreateImageBitmap,
    hasCanvas,
    hasOpfs,
    hasVideoEncoder,
    coarsePointer,
    maxMegapixels: overrides.maxMegapixels ?? (isIOS ? 16 : 64),
    maxAxisPixels: overrides.maxAxisPixels ?? (isIOS ? 8192 : 16384),
    maxSourceBytes: overrides.maxSourceBytes ?? (isIOS ? 100 * 1024 * 1024 : 512 * 1024 * 1024),
    rejectSourceBytes: overrides.rejectSourceBytes ?? (isIOS ? 100 * 1024 * 1024 : 1024 * 1024 * 1024),
    peakMemoryBytes: overrides.peakMemoryBytes ?? (isIOS ? 256 * 1024 * 1024 : 1024 * 1024 * 1024),
    concurrency: overrides.concurrency ?? ((isIOS || isMobile || coarsePointer) ? 1 : 2),
    warnSourceBytes: overrides.warnSourceBytes ?? (isIOS ? 100 * 1024 * 1024 : 256 * 1024 * 1024),
    allowStreamingBypass: overrides.allowStreamingBypass ?? !isIOS,
  });
}

/**
 * @param {string} adapter
 * @param {object} params
 * @param {number} params.sourceBytes
 * @param {number} [params.width]
 * @param {number} [params.height]
 * @param {number} [params.durationSec]
 * @param {number} [params.rowCount]
 * @returns {number}
 */
export function estimatePeakMemory(adapter, params) {
  const { sourceBytes, width = 0, height = 0, durationSec = 0, rowCount = 0 } = params;

  switch (adapter) {
    case 'image': {
      const pixels = width * height || sourceBytes;
      return Math.max(sourceBytes * 3, pixels * 4 * 2);
    }
    case 'wav':
      return sourceBytes * 3;
    case 'video':
      return sourceBytes * 2 + durationSec * 1024 * 1024;
    case 'data':
      return sourceBytes * 4 + rowCount * 512;
    default:
      return sourceBytes * 2;
  }
}

/**
 * @param {object} params
 * @param {DeviceProfile} params.deviceProfile
 * @param {number} params.sourceBytes
 * @param {number} [params.width]
 * @param {number} [params.height]
 * @param {string} [params.adapter]
 * @param {boolean} [params.streaming]
 * @returns {{ admitted: boolean, code?: string, message?: string, warnings?: string[] }}
 */
export function evaluateAdmission(params) {
  const {
    deviceProfile,
    sourceBytes,
    width = 0,
    height = 0,
    adapter = 'image',
    streaming = false,
  } = params;

  const warnings = [];

  if (sourceBytes > deviceProfile.rejectSourceBytes && !(streaming && deviceProfile.allowStreamingBypass)) {
    return {
      admitted: false,
      code: ADMISSION_ERROR.FILE_TOO_LARGE,
      message: `File exceeds maximum size (${deviceProfile.rejectSourceBytes} bytes)`,
    };
  }

  if (sourceBytes > deviceProfile.warnSourceBytes) {
    warnings.push(`Large source file (${sourceBytes} bytes) may be slow on this device`);
  }

  if (width > 0 && height > 0) {
    const megapixels = (width * height) / 1_000_000;
    if (megapixels > deviceProfile.maxMegapixels) {
      return {
        admitted: false,
        code: ADMISSION_ERROR.DIMENSIONS_TOO_LARGE,
        message: `Image dimensions exceed ${deviceProfile.maxMegapixels}MP limit`,
      };
    }
    if (width > deviceProfile.maxAxisPixels || height > deviceProfile.maxAxisPixels) {
      return {
        admitted: false,
        code: ADMISSION_ERROR.DIMENSIONS_TOO_LARGE,
        message: `Image axis exceeds ${deviceProfile.maxAxisPixels}px limit`,
      };
    }
  }

  const peak = estimatePeakMemory(adapter, { sourceBytes, width, height });
  if (peak > deviceProfile.peakMemoryBytes) {
    return {
      admitted: false,
      code: ADMISSION_ERROR.MEMORY_BUDGET_EXCEEDED,
      message: `Estimated peak memory ${peak} exceeds budget ${deviceProfile.peakMemoryBytes}`,
    };
  }

  return { admitted: true, warnings };
}

/**
 * V2 admission checks merge/split limits and two-pass memory multiplier.
 * @param {object} params
 * @param {DeviceProfile} params.deviceProfile
 * @param {number} params.sourceBytes
 * @param {number} [params.width]
 * @param {number} [params.height]
 * @param {number} [params.durationSec]
 * @param {string} [params.adapter]
 * @param {boolean} [params.streaming]
 * @param {number} [params.mergeInputCount]
 * @param {number} [params.splitSegmentCount]
 * @param {boolean} [params.twoPass]
 * @returns {{ admitted: boolean, code?: string, message?: string, warnings?: string[] }}
 */
export function evaluateV2Admission(params) {
  const {
    mergeInputCount = 0,
    splitSegmentCount = 0,
    twoPass = false,
    deviceProfile,
    sourceBytes,
    width = 0,
    height = 0,
    durationSec = 0,
    adapter = 'image',
    streaming = false,
  } = params;

  if (mergeInputCount > 12) {
    return {
      admitted: false,
      code: ADMISSION_ERROR.MERGE_INPUT_COUNT_EXCEEDED,
      message: 'Merge operations support at most 12 input files',
    };
  }

  if (splitSegmentCount > 20) {
    return {
      admitted: false,
      code: ADMISSION_ERROR.SPLIT_SEGMENT_COUNT_EXCEEDED,
      message: 'Split operations support at most 20 segments',
    };
  }

  const base = evaluateAdmission({
    deviceProfile,
    sourceBytes,
    width,
    height,
    adapter,
    streaming,
  });

  if (!base.admitted) {
    return base;
  }

  if (twoPass) {
    const peak = estimatePeakMemory(adapter, { sourceBytes, width, height, durationSec });
    const adjustedPeak = peak * 1.5;
    if (adjustedPeak > deviceProfile.peakMemoryBytes) {
      return {
        admitted: false,
        code: ADMISSION_ERROR.MEMORY_BUDGET_EXCEEDED,
        message: `Two-pass estimated peak memory ${Math.round(adjustedPeak)} exceeds budget ${deviceProfile.peakMemoryBytes}`,
      };
    }
  }

  return base;
}
