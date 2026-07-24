/** Allowlisted typed ffmpeg builders — no arbitrary argv. */

const ALLOWED_OPERATIONS = new Set([
  'image-to-png',
  'image-to-jpeg',
  'image-to-webp',
  'image-to-gif',
  'audio-to-mp3',
  'audio-to-wav',
  'audio-to-ogg',
  'audio-to-aac',
  'video-to-mp4',
  'video-to-webm',
  'video-to-gif',
  'video-extract-audio',
  'convertVideoAdvanced',
  'convertAudioAdvanced',
]);

function clampInt(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

export function validatePlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) {
    return { ok: false, code: 'PLAN_INVALID' };
  }
  if ('argv' in plan || 'ffmpegArgs' in plan || 'command' in plan || 'shell' in plan) {
    return { ok: false, code: 'PLAN_INVALID' };
  }
  const operationId = typeof plan.operationId === 'string' ? plan.operationId : '';
  if (!ALLOWED_OPERATIONS.has(operationId)) {
    return { ok: false, code: 'PLAN_INVALID' };
  }
  return { ok: true, operationId, plan };
}

/**
 * Returns { ffprobeArgs, ffmpegArgs, outputExt, mimeType } for a validated plan.
 */
export function buildFfmpegInvocation(operationId, plan, inputPath, outputPath) {
  const opts = plan?.options && typeof plan.options === 'object' ? plan.options : {};

  switch (operationId) {
    case 'image-to-png':
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-frames:v', '1', outputPath],
        outputExt: '.png',
        mimeType: 'image/png',
      };
    case 'image-to-jpeg': {
      const q = clampInt(opts.quality, 2, 31, 5);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-q:v', String(q), outputPath],
        outputExt: '.jpg',
        mimeType: 'image/jpeg',
      };
    }
    case 'image-to-webp': {
      const q = clampInt(opts.quality, 0, 100, 80);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-quality', String(q), outputPath],
        outputExt: '.webp',
        mimeType: 'image/webp',
      };
    }
    case 'image-to-gif':
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-vf', 'fps=10,scale=320:-1:flags=lanczos', outputPath],
        outputExt: '.gif',
        mimeType: 'image/gif',
      };
    case 'audio-to-mp3': {
      const br = clampInt(opts.bitrateKbps, 64, 320, 192);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:a', 'libmp3lame', '-b:a', `${br}k`, outputPath],
        outputExt: '.mp3',
        mimeType: 'audio/mpeg',
      };
    }
    case 'audio-to-wav':
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:a', 'pcm_s16le', outputPath],
        outputExt: '.wav',
        mimeType: 'audio/wav',
      };
    case 'audio-to-ogg': {
      const q = clampInt(opts.quality, -1, 10, 5);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:a', 'libvorbis', '-q:a', String(q), outputPath],
        outputExt: '.ogg',
        mimeType: 'audio/ogg',
      };
    }
    case 'audio-to-aac': {
      const br = clampInt(opts.bitrateKbps, 64, 320, 128);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:a', 'aac', '-b:a', `${br}k`, outputPath],
        outputExt: '.m4a',
        mimeType: 'audio/mp4',
      };
    }
    case 'video-to-mp4': {
      const crf = clampInt(opts.crf, 18, 32, 23);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:v', 'libx264', '-crf', String(crf), '-codec:a', 'aac', outputPath],
        outputExt: '.mp4',
        mimeType: 'video/mp4',
      };
    }
    case 'video-to-webm': {
      const crf = clampInt(opts.crf, 18, 40, 31);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:v', 'libvpx-vp9', '-crf', String(crf), '-b:v', '0', outputPath],
        outputExt: '.webm',
        mimeType: 'video/webm',
      };
    }
    case 'video-to-gif':
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-vf', 'fps=10,scale=480:-1:flags=lanczos', outputPath],
        outputExt: '.gif',
        mimeType: 'image/gif',
      };
    case 'video-extract-audio':
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-vn', '-codec:a', 'libmp3lame', '-b:a', '192k', outputPath],
        outputExt: '.mp3',
        mimeType: 'audio/mpeg',
      };
    case 'convertVideoAdvanced': {
      const preset = ['ultrafast', 'fast', 'medium', 'slow'].includes(opts.preset) ? opts.preset : 'medium';
      const crf = clampInt(opts.crf, 18, 32, 23);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:v', 'libx264', '-preset', preset, '-crf', String(crf), '-codec:a', 'aac', outputPath],
        outputExt: '.mp4',
        mimeType: 'video/mp4',
      };
    }
    case 'convertAudioAdvanced': {
      const br = clampInt(opts.bitrateKbps, 64, 320, 192);
      return {
        ffprobeArgs: ['-v', 'error', '-show_format', '-show_streams', inputPath],
        ffmpegArgs: ['-y', '-i', inputPath, '-codec:a', 'libmp3lame', '-b:a', `${br}k`, outputPath],
        outputExt: '.mp3',
        mimeType: 'audio/mpeg',
      };
    }
    default:
      return null;
  }
}

export { ALLOWED_OPERATIONS };
