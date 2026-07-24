/**
 * Conversion capability resolution and matrix exports.
 */

export { CONVERTER_FEATURE_FLAGS } from './converter-feature-flags.js';
export { FORMAT_MIME, RECOGNIZED_EXTENSIONS, RECOGNIZED_MIMES } from './format-mime.js';
export { CONVERSION_OPERATIONS } from './conversion-operations.js';

import { CONVERTER_FEATURE_FLAGS } from './converter-feature-flags.js';
import { CONVERSION_OPERATIONS } from './conversion-operations.js';
import { FORMAT_MIME, RECOGNIZED_EXTENSIONS, RECOGNIZED_MIMES } from './format-mime.js';
import { getWarningMessage } from './converter-warnings.js';

/** @typedef {'image' | 'audio' | 'video' | 'data'} ConverterCategory */

/** @typedef {import('./conversion-operations.js').ConversionOperation} ConversionOperation */

export const CONVERTER_CATEGORIES = Object.freeze(['image', 'audio', 'video', 'data']);

export const SUPPORT_REASON = Object.freeze({
  SUPPORTED: 'SUPPORTED',
  UNKNOWN_OPERATION: 'UNKNOWN_OPERATION',
  WORKERS_UNAVAILABLE: 'WORKERS_UNAVAILABLE',
  OFFSCREEN_CANVAS_UNAVAILABLE: 'OFFSCREEN_CANVAS_UNAVAILABLE',
  VIDEO_ENCODER_UNAVAILABLE: 'VIDEO_ENCODER_UNAVAILABLE',
  OPFS_UNAVAILABLE: 'OPFS_UNAVAILABLE',
  CATEGORY_DISABLED: 'CATEGORY_DISABLED',
  FFMPEG_UNAVAILABLE: 'FFMPEG_UNAVAILABLE',
  FFMPEG_DISABLED: 'FFMPEG_DISABLED',
});

const OPERATIONS_BY_ID = new Map(CONVERSION_OPERATIONS.map((op) => [op.id, op]));

const TRANSCODE_OPS = new Set(['mp4-to-webm', 'webm-to-mp4']);

/**
 * @param {ConverterCategory} category
 * @returns {ReadonlyArray<ConversionOperation>}
 */
export function listOperationsForCategory(category) {
  return CONVERSION_OPERATIONS.filter((op) => op.category === category);
}

/**
 * @param {string} id
 * @returns {ConversionOperation | undefined}
 */
export function getOperationById(id) {
  return OPERATIONS_BY_ID.get(id);
}

/**
 * @param {ConverterCategory} [category]
 * @returns {string}
 */
export function getAcceptAttribute(category) {
  const ops = category
    ? CONVERSION_OPERATIONS.filter((op) => op.category === category)
    : CONVERSION_OPERATIONS;
  const exts = new Set();
  const mimes = new Set();
  for (const op of ops) {
    for (const fmt of op.inputFormats) {
      const ext = fmt === 'jpeg' ? 'jpg' : fmt;
      exts.add(`.${ext}`);
      const mime = FORMAT_MIME[fmt];
      if (mime) mimes.add(mime);
    }
  }
  return [...mimes, ...exts].join(',');
}

/**
 * @param {string} format
 * @returns {ReadonlyArray<ConversionOperation>}
 */
export function listOperationsForInputFormat(format) {
  const normalized = format.toLowerCase().replace(/^\./, '');
  const alias = normalized === 'jpg' ? 'jpeg' : normalized;
  return CONVERSION_OPERATIONS.filter((op) =>
    op.inputFormats.some((f) => f === alias || f === normalized || (normalized === 'yml' && f === 'yaml')),
  );
}

/**
 * @typedef {'available' | 'available-with-warning' | 'unsupported'} SupportStatus
 */

/**
 * @param {ConversionOperation | string | undefined | null} entry
 * @param {import('./converter-limits.js').DeviceProfile} deviceProfile
 * @param {object} [options]
 * @param {boolean} [options.requireFfmpeg]
 * @returns {{ status: SupportStatus, supported: boolean, reason: string, message?: string, warnings: ReadonlyArray<{ code: string, message: string }> }}
 */
export function resolveConversionSupport(entry, deviceProfile, options = {}) {
  const operation = typeof entry === 'string' ? getOperationById(entry) : entry;
  if (!operation) {
    return {
      status: 'unsupported',
      supported: false,
      reason: SUPPORT_REASON.UNKNOWN_OPERATION,
      message: 'Unknown conversion operation',
      warnings: [],
    };
  }

  const req = operation.runtimeRequirements ?? {};
  const warnings = operation.warnings.map((code) => ({
    code: String(code),
    message: getWarningMessage(code),
  }));

  if (req.worker && !deviceProfile.hasWorkers) {
    return unsupported(SUPPORT_REASON.WORKERS_UNAVAILABLE, 'Web Workers are unavailable', warnings);
  }
  if (req.offscreenCanvas && !deviceProfile.hasOffscreenCanvas && !deviceProfile.hasCanvas) {
    return unsupported(SUPPORT_REASON.OFFSCREEN_CANVAS_UNAVAILABLE, 'Canvas rendering is unavailable', warnings);
  }
  if (req.videoEncoder && TRANSCODE_OPS.has(operation.id) && !deviceProfile.hasVideoEncoder) {
    return unsupported(SUPPORT_REASON.VIDEO_ENCODER_UNAVAILABLE, 'VideoEncoder is unavailable for transcode', warnings);
  }
  if (req.opfs && !deviceProfile.hasOpfs) {
    return unsupported(SUPPORT_REASON.OPFS_UNAVAILABLE, 'OPFS is unavailable', warnings);
  }

  // Only block when FFmpeg is required (sole candidate or explicit runtimeRequirement).
  // Mediabunny/native-first ops that list ffmpeg as fallback stay available when FFmpeg is disabled.
  const candidates = operation.engineCandidates ?? [];
  const nonFfmpegCandidates = candidates.filter((c) => c !== 'ffmpeg');
  const ffmpegRequired = Boolean(req.ffmpeg)
    || (candidates.includes('ffmpeg') && nonFfmpegCandidates.length === 0);
  const ffmpegEnabled = options.enableFfmpeg ?? CONVERTER_FEATURE_FLAGS.ENABLE_FFMPEG;
  if (ffmpegRequired && !ffmpegEnabled) {
    return unsupported(SUPPORT_REASON.FFMPEG_DISABLED, 'FFmpeg conversions are disabled', warnings);
  }
  if (ffmpegRequired && options.requireFfmpeg === false) {
    return unsupported(SUPPORT_REASON.FFMPEG_UNAVAILABLE, 'FFmpeg runtime is not loaded', warnings);
  }

  if (deviceProfile.isMobile && operation.resourceClass === 'heavy') {
    warnings.push({ code: 'MOBILE_LIMIT', message: getWarningMessage('MOBILE_LIMIT') });
  }

  const staticWarnings = operation.warnings.length > 0;
  const status = staticWarnings || warnings.some((w) => w.code === 'MOBILE_LIMIT')
    ? 'available-with-warning'
    : 'available';

  return {
    status,
    supported: true,
    reason: SUPPORT_REASON.SUPPORTED,
    warnings: Object.freeze([...warnings]),
  };
}

/**
 * @param {string} reason
 * @param {string} message
 * @param {ReadonlyArray<{ code: string, message: string }>} warnings
 */
function unsupported(reason, message, warnings) {
  return {
    status: 'unsupported',
    supported: false,
    reason,
    message,
    warnings: Object.freeze([...warnings]),
  };
}
