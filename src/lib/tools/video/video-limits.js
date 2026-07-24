/** Video Plan 1 — soft warnings only (no hard feature caps). */

export const VIDEO_ACCEPT = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
].join(',');

export const VIDEO_ACCEPT_ATTR = `${VIDEO_ACCEPT},.mp4,.webm,.mov,.avi,.mp3,.wav,.m4a,.ogg,.aac,.png,.jpg,.jpeg,.webp`;

export const VIDEO_HISTORY_LIMIT = 40;

/** Default still-image clip length on the video track. */
export const VIDEO_IMAGE_DEFAULT_MS = 3000;

/** Soft warn when a single file exceeds this (still allowed). */
export const VIDEO_WARN_FILE_BYTES = 500 * 1024 * 1024;

/** Soft warn when project duration exceeds this. */
export const VIDEO_WARN_DURATION_MS = 30 * 60 * 1000;

/** Soft warn when media count is very large. */
export const VIDEO_WARN_MEDIA_COUNT = 40;

export const VIDEO_ASPECT_PRESETS = Object.freeze([
  { id: '16:9', label: '16:9', width: 1920, height: 1080 },
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
]);

/**
 * @param {File} file
 * @returns {{ ok: true, kind: 'video'|'audio'|'image', warn?: string } | { ok: false, code: string, message: string }}
 */
export function validateVideoImportFile(file) {
  if (!file) return { ok: false, code: 'empty', message: 'No file provided.' };
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  let kind = /** @type {'video'|'audio'|'image'|null} */ (null);
  if (type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv)$/.test(name)) kind = 'video';
  else if (type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac)$/.test(name)) kind = 'audio';
  else if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)) kind = 'image';
  if (!kind) {
    return { ok: false, code: 'type', message: 'Unsupported media type.' };
  }
  /** @type {{ ok: true, kind: 'video'|'audio'|'image', warn?: string }} */
  const result = { ok: true, kind };
  if (file.size > VIDEO_WARN_FILE_BYTES) {
    result.warn = `${file.name} is very large (${(file.size / (1024 * 1024)).toFixed(0)} MB) — editing may be slow.`;
  }
  return result;
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @returns {string[]}
 */
export function softWarningsForProject(project) {
  /** @type {string[]} */
  const warns = [];
  if (project.media.length >= VIDEO_WARN_MEDIA_COUNT) {
    warns.push(`Large media library (${project.media.length} items) — performance may drop.`);
  }
  const dur = project.durationMs || 0;
  if (dur >= VIDEO_WARN_DURATION_MS) {
    warns.push(`Timeline is ${(dur / 60000).toFixed(0)}+ minutes — export may take a while.`);
  }
  return warns;
}
