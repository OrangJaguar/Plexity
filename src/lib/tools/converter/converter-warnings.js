/** @typedef {'info' | 'destructive'} WarningSeverity */

/** @typedef {'LOSSY' | 'FLATTEN_ALPHA' | 'DROP_ANIMATION' | 'STRIP_METADATA' | 'LOSE_TRACKS' | 'CODEC_FALLBACK' | 'UPSCALE' | 'MEMORY' | 'MOBILE_LIMIT' | 'FFMPEG_REQUIRED' | 'GPS_METADATA' | 'TARGET_SIZE_APPROX' | 'MERGE_LOSSY' | 'SPLIT_LOSSY' | 'ESTIMATE_UNCERTAIN' | 'STRUCTURE_PRESERVE' | 'TWO_PASS'} ConverterWarningCode */

export const WARNING_CODES = Object.freeze({
  LOSSY: 'LOSSY',
  FLATTEN_ALPHA: 'FLATTEN_ALPHA',
  DROP_ANIMATION: 'DROP_ANIMATION',
  STRIP_METADATA: 'STRIP_METADATA',
  LOSE_TRACKS: 'LOSE_TRACKS',
  CODEC_FALLBACK: 'CODEC_FALLBACK',
  UPSCALE: 'UPSCALE',
  MEMORY: 'MEMORY',
  MOBILE_LIMIT: 'MOBILE_LIMIT',
  FFMPEG_REQUIRED: 'FFMPEG_REQUIRED',
  GPS_METADATA: 'GPS_METADATA',
  TARGET_SIZE_APPROX: 'TARGET_SIZE_APPROX',
  MERGE_LOSSY: 'MERGE_LOSSY',
  SPLIT_LOSSY: 'SPLIT_LOSSY',
  ESTIMATE_UNCERTAIN: 'ESTIMATE_UNCERTAIN',
  STRUCTURE_PRESERVE: 'STRUCTURE_PRESERVE',
  TWO_PASS: 'TWO_PASS',
});

/** @type {Readonly<Record<ConverterWarningCode, string>>} */
export const WARNING_MESSAGES = Object.freeze({
  LOSSY: 'Output uses lossy compression; some quality may be lost.',
  FLATTEN_ALPHA: 'Transparency will be flattened onto a solid background.',
  DROP_ANIMATION: 'Animated frames will be reduced to a single still image.',
  STRIP_METADATA: 'Metadata such as EXIF or ID3 tags may be removed.',
  LOSE_TRACKS: 'Secondary audio or subtitle tracks may be dropped.',
  CODEC_FALLBACK: 'Preferred codec unavailable; a compatible fallback will be used.',
  UPSCALE: 'Output dimensions exceed source; upscaling may reduce quality.',
  MEMORY: 'Large file may exceed available memory on this device.',
  MOBILE_LIMIT: 'Operation may be slow or limited on mobile devices.',
  FFMPEG_REQUIRED: 'Requires FFmpeg runtime for this conversion.',
  GPS_METADATA: 'Source appears to contain location (GPS) metadata.',
  TARGET_SIZE_APPROX: 'Target size is approximate; exact byte size is not guaranteed.',
  MERGE_LOSSY: 'Merging may re-encode and lose quality or tracks.',
  SPLIT_LOSSY: 'Splitting may re-encode segment boundaries.',
  ESTIMATE_UNCERTAIN: 'Output size estimate is uncertain until conversion finishes.',
  STRUCTURE_PRESERVE: 'Folder structure will be preserved in the package.',
  TWO_PASS: 'A second encoding pass may run to approach the target size.',
});

export const CONVERTER_WARNING_CODES = Object.freeze(Object.keys(WARNING_MESSAGES));

const DESTRUCTIVE_CODES = new Set([
  WARNING_CODES.LOSSY,
  WARNING_CODES.FLATTEN_ALPHA,
  WARNING_CODES.DROP_ANIMATION,
  WARNING_CODES.LOSE_TRACKS,
  WARNING_CODES.GPS_METADATA,
  WARNING_CODES.STRIP_METADATA,
  WARNING_CODES.MERGE_LOSSY,
]);

/**
 * @param {string | ConverterWarningCode} code
 * @returns {string}
 */
export function getWarningMessage(code) {
  const key = /** @type {ConverterWarningCode} */ (String(code).toUpperCase());
  return WARNING_MESSAGES[key] ?? String(code);
}

/**
 * @param {ReadonlyArray<string | ConverterWarningCode>} codes
 * @returns {ReadonlyArray<{ code: string, message: string }>}
 */
export function resolveWarnings(codes) {
  return Object.freeze(
    (codes ?? []).map((code) => {
      const normalized = String(code).toUpperCase();
      return Object.freeze({
        code: normalized,
        message: getWarningMessage(normalized),
      });
    }),
  );
}

/**
 * @param {string} code
 * @returns {{ code: string, message: string, severity: WarningSeverity }}
 */
export function formatWarning(code) {
  const normalized = String(code ?? '').trim().toUpperCase();
  return {
    code: normalized,
    message: getWarningMessage(normalized),
    severity: DESTRUCTIVE_CODES.has(normalized) ? 'destructive' : 'info',
  };
}

/**
 * @param {string} code
 * @returns {boolean}
 */
export function isDestructiveWarning(code) {
  return DESTRUCTIVE_CODES.has(String(code).toUpperCase());
}
