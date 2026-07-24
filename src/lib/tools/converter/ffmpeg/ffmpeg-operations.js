/**
 * Allowlisted FFmpeg operation builders — never interpolate raw user filenames into argv.
 */

/** @typedef {ReadonlyArray<string>} FfmpegArgv */

export const VIRTUAL_INPUT = 'input';
export const VIRTUAL_OUTPUT = 'output';

const ALLOWED_VIDEO_CODECS = new Set(['libx264', 'libvpx-vp9']);
const ALLOWED_AUDIO_CODECS = new Set(['aac', 'libopus']);
const ALLOWED_FPS = new Set([24, 25, 30, 60]);
const ALLOWED_SAMPLE_RATES = new Set([8000, 11025, 16000, 22050, 44100, 48000]);
const ALLOWED_CHANNELS = new Set([1, 2]);

/**
 * @param {string} ext
 * @returns {string}
 */
export function sanitizeVirtualName(ext) {
  const safeExt = String(ext ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${VIRTUAL_INPUT}.${safeExt || 'bin'}`;
}

/**
 * @param {string} ext
 * @returns {string}
 */
export function sanitizeVirtualOutput(ext) {
  const safeExt = String(ext ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${VIRTUAL_OUTPUT}.${safeExt || 'bin'}`;
}

/**
 * @param {number} index
 * @param {string} ext
 * @returns {string}
 */
export function sanitizeVirtualInput(index, ext) {
  const safeExt = String(ext ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const idx = Math.max(0, Math.floor(Number(index) || 0));
  return `input${idx}.${safeExt || 'bin'}`;
}

/**
 * @param {string | undefined} codec
 * @param {Set<string>} allowed
 * @param {string} fallback
 * @returns {string}
 */
function pickCodec(codec, allowed, fallback) {
  return allowed.has(String(codec ?? '')) ? String(codec) : fallback;
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {number} [params.bitrateKbps]
 * @returns {FfmpegArgv}
 */
export function convertAudioToMp3(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const output = sanitizeVirtualOutput('mp3');
  const bitrate = Math.min(320, Math.max(32, Number(params.bitrateKbps ?? 192)));
  return Object.freeze([
    '-i', input,
    '-vn',
    '-codec:a', 'libmp3lame',
    '-b:a', `${bitrate}k`,
    '-y', output,
  ]);
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {number} [params.videoBitrateKbps]
 * @returns {FfmpegArgv}
 */
export function convertVideoToMp4(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const output = sanitizeVirtualOutput('mp4');
  const vBitrate = Math.min(8000, Math.max(500, Number(params.videoBitrateKbps ?? 2500)));
  return Object.freeze([
    '-i', input,
    '-codec:v', 'libx264',
    '-preset', 'fast',
    '-b:v', `${vBitrate}k`,
    '-codec:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y', output,
  ]);
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} [params.outputExt]
 * @param {number} [params.bitrateKbps]
 * @returns {FfmpegArgv}
 */
export function extractAudioFromVideo(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const ext = String(params.outputExt ?? 'mp3').toLowerCase().replace(/^\./, '');
  const output = sanitizeVirtualOutput(ext);
  const bitrate = Math.min(320, Math.max(32, Number(params.bitrateKbps ?? 192)));

  if (ext === 'wav') {
    return Object.freeze(['-i', input, '-vn', '-y', output]);
  }

  /** @type {Record<string, string>} */
  const codecByExt = {
    mp3: 'libmp3lame',
    m4a: 'aac',
    aac: 'aac',
    ogg: 'libvorbis',
    opus: 'libopus',
    flac: 'flac',
  };
  const codec = codecByExt[ext] ?? 'libmp3lame';
  /** @type {string[]} */
  const argv = ['-i', input, '-vn', '-codec:a', codec];
  if (ext !== 'flac') {
    argv.push('-b:a', `${bitrate}k`);
  }
  argv.push('-y', output);
  return Object.freeze(argv);
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @returns {FfmpegArgv}
 */
export function convertImageViaFfmpeg(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const output = sanitizeVirtualOutput(params.outputExt);
  return Object.freeze(['-i', input, '-frames:v', '1', '-y', output]);
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {number} [params.bitrateKbps]
 * @returns {FfmpegArgv}
 */
export function convertAudioGeneric(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const output = sanitizeVirtualOutput(params.outputExt);
  const ext = params.outputExt.toLowerCase();
  if (ext === 'mp3') return convertAudioToMp3(params);
  if (ext === 'wav') {
    return Object.freeze(['-i', input, '-y', output]);
  }
  const bitrate = Math.min(320, Math.max(32, Number(params.bitrateKbps ?? 192)));
  return Object.freeze([
    '-i', input,
    '-vn',
    '-b:a', `${bitrate}k`,
    '-y', output,
  ]);
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {number} params.videoBitrateKbps
 * @param {number} params.audioBitrateKbps
 * @param {number} [params.width]
 * @param {number} [params.height]
 * @param {number} [params.fps]
 * @param {string} [params.videoCodec]
 * @param {string} [params.audioCodec]
 * @returns {FfmpegArgv}
 */
export function convertVideoAdvanced(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const output = sanitizeVirtualOutput(params.outputExt);
  const vBitrate = Math.min(8000, Math.max(500, Number(params.videoBitrateKbps ?? 2500)));
  const aBitrate = Math.min(320, Math.max(32, Number(params.audioBitrateKbps ?? 128)));
  const videoCodec = pickCodec(params.videoCodec, ALLOWED_VIDEO_CODECS, 'libx264');
  const audioCodec = pickCodec(params.audioCodec, ALLOWED_AUDIO_CODECS, 'aac');

  /** @type {string[]} */
  const argv = ['-i', input];
  /** @type {string[]} */
  const filters = [];

  if (params.width != null && params.height != null) {
    const width = Math.min(8192, Math.max(1, Math.floor(Number(params.width))));
    const height = Math.min(8192, Math.max(1, Math.floor(Number(params.height))));
    filters.push(`scale=${width}:${height}`);
  }
  if (params.fps != null) {
    const fps = ALLOWED_FPS.has(Number(params.fps)) ? Number(params.fps) : 30;
    filters.push(`fps=${fps}`);
  }
  if (filters.length) {
    argv.push('-vf', filters.join(','));
  }

  argv.push('-codec:v', videoCodec, '-b:v', `${vBitrate}k`);
  argv.push('-codec:a', audioCodec, '-b:a', `${aBitrate}k`);

  if (String(params.outputExt ?? '').toLowerCase() === 'mp4') {
    argv.push('-movflags', '+faststart');
  }

  argv.push('-y', output);
  return Object.freeze(argv);
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {number} params.bitrateKbps
 * @param {number} [params.sampleRate]
 * @param {number} [params.channels]
 * @returns {FfmpegArgv}
 */
export function convertAudioAdvanced(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const output = sanitizeVirtualOutput(params.outputExt);
  const bitrate = Math.min(320, Math.max(32, Number(params.bitrateKbps ?? 192)));

  /** @type {string[]} */
  const argv = ['-i', input, '-vn'];

  if (params.sampleRate != null) {
    const sampleRate = ALLOWED_SAMPLE_RATES.has(Number(params.sampleRate))
      ? Number(params.sampleRate)
      : 44100;
    argv.push('-ar', String(sampleRate));
  }
  if (params.channels != null) {
    const channels = ALLOWED_CHANNELS.has(Number(params.channels))
      ? Number(params.channels)
      : 2;
    argv.push('-ac', String(channels));
  }

  argv.push('-b:a', `${bitrate}k`, '-y', output);
  return Object.freeze(argv);
}

/**
 * @param {object} params
 * @param {number} params.inputCount
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {'demuxer' | 'filter'} params.mode
 * @returns {FfmpegArgv}
 */
export function concatMedia(params) {
  const inputCount = Math.min(12, Math.max(2, Math.floor(Number(params.inputCount) || 2)));
  const output = sanitizeVirtualOutput(params.outputExt);
  const safeExt = String(params.inputExt ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';

  if (params.mode === 'filter') {
    /** @type {string[]} */
    const argv = [];
    for (let i = 0; i < inputCount; i += 1) {
      argv.push('-i', sanitizeVirtualInput(i, params.inputExt));
    }
    const streams = Array.from({ length: inputCount }, (_, i) => `[${i}:v][${i}:a]`).join('');
    argv.push(
      '-filter_complex',
      `${streams}concat=n=${inputCount}:v=1:a=1[outv][outa]`,
      '-map', '[outv]',
      '-map', '[outa]',
      '-y', output,
    );
    return Object.freeze(argv);
  }

  const listFile = `concat-list.${safeExt}.txt`;
  return Object.freeze([
    '-f', 'concat',
    '-safe', '0',
    '-i', listFile,
    '-c', 'copy',
    '-y', output,
  ]);
}

/**
 * @param {object} params
 * @param {string} params.inputExt
 * @param {string} params.outputExt
 * @param {number} params.startSec
 * @param {number} params.durationSec
 * @returns {FfmpegArgv}
 */
export function splitMediaSegment(params) {
  const input = sanitizeVirtualName(params.inputExt);
  const output = sanitizeVirtualOutput(params.outputExt);
  const startSec = Math.max(0, Number(params.startSec ?? 0));
  const durationSec = Math.max(0.001, Number(params.durationSec ?? 1));
  return Object.freeze([
    '-ss', String(startSec),
    '-i', input,
    '-t', String(durationSec),
    '-c', 'copy',
    '-y', output,
  ]);
}

/** @type {Readonly<Record<string, (params: object) => FfmpegArgv>>} */
export const FFMPEG_OPERATION_BUILDERS = Object.freeze({
  convertAudioToMp3,
  convertVideoToMp4,
  extractAudioFromVideo,
  convertImageViaFfmpeg,
  convertAudioGeneric,
  convertVideoAdvanced,
  convertAudioAdvanced,
  concatMedia,
  splitMediaSegment,
});

/**
 * @param {string} builderName
 * @param {object} params
 * @returns {FfmpegArgv}
 */
export function buildFfmpegArgv(builderName, params) {
  const builder = FFMPEG_OPERATION_BUILDERS[builderName];
  if (!builder) {
    throw new Error(`Disallowed FFmpeg builder: ${builderName}`);
  }
  return builder(params);
}

/**
 * @param {ReadonlyArray<string>} argv
 * @returns {boolean}
 */
export function isAllowlistedFfmpegArgv(argv) {
  if (!Array.isArray(argv) || argv.length === 0) return false;
  for (const token of argv) {
    if (typeof token !== 'string') return false;
    if (/[;&|`$<>]/.test(token)) return false;
    if (/\.\.\//.test(token)) return false;
  }
  return true;
}
