/**
 * Select conversion engine from operation candidates and device profile.
 */

import { CONVERTER_FEATURE_FLAGS } from './converter-feature-flags.js';

/** @typedef {'native-image' | 'wav' | 'data' | 'mediabunny' | 'ffmpeg'} ConversionEngine */

/**
 * @param {import('./conversion-operations.js').ConversionOperation} operation
 * @param {import('./converter-limits.js').DeviceProfile} deviceProfile
 * @param {object} [flags]
 * @param {boolean} [flags.ffmpegLoaded]
 * @param {boolean} [flags.preferFfmpeg]
 * @returns {{ engine: ConversionEngine | null, reason: string }}
 */
export function selectConversionEngine(operation, deviceProfile, flags = {}) {
  const candidates = operation.engineCandidates ?? [];
  const ffmpegLoaded = flags.ffmpegLoaded ?? CONVERTER_FEATURE_FLAGS.ENABLE_FFMPEG;
  const options = flags.options ?? {};
  const preferFfmpeg = flags.preferFfmpeg ?? (
    options.targetBytes != null
    || operation.id.startsWith('merge-')
    || operation.id.startsWith('split-')
  );

  const ordered = preferFfmpeg
    ? [...candidates].sort((a, b) => (a === 'ffmpeg' ? -1 : b === 'ffmpeg' ? 1 : 0))
    : candidates;

  for (const candidate of ordered) {
    switch (candidate) {
      case 'native-image':
        if (deviceProfile.hasCreateImageBitmap && (deviceProfile.hasOffscreenCanvas || deviceProfile.hasCanvas)) {
          return { engine: 'native-image', reason: 'Native image bitmap pipeline available' };
        }
        break;
      case 'wav':
        return { engine: 'wav', reason: 'PCM WAV adapter available' };
      case 'data':
        return { engine: 'data', reason: 'Structured data adapter available' };
      case 'mediabunny':
        if (operation.category === 'video' && deviceProfile.hasWorkers) {
          if (!operation.runtimeRequirements?.videoEncoder || deviceProfile.hasVideoEncoder) {
            return { engine: 'mediabunny', reason: 'MediaBunny video pipeline available' };
          }
        }
        break;
      case 'ffmpeg':
        if (CONVERTER_FEATURE_FLAGS.ENABLE_FFMPEG && ffmpegLoaded) {
          return { engine: 'ffmpeg', reason: 'FFmpeg runtime available' };
        }
        break;
      default:
        break;
    }
  }

  return { engine: null, reason: 'No compatible engine for this operation on this device' };
}

/**
 * @param {string} adapter
 * @returns {ConversionEngine | null}
 */
export function engineForAdapter(adapter) {
  const map = {
    image: 'native-image',
    wav: 'wav',
    data: 'data',
    video: 'mediabunny',
    audio: 'ffmpeg',
  };
  return /** @type {ConversionEngine | null} */ (map[adapter] ?? null);
}
