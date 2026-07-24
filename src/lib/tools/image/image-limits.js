/** Image tool size / megapixel guards (Plan 1). */

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/jpg,image/webp,image/gif,image/bmp,image/avif';

export const IMAGE_ACCEPT_EXTENSIONS = Object.freeze([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif',
]);

/** Hard reject above this many bytes. */
export const IMAGE_MAX_FILE_BYTES = 40 * 1024 * 1024;

/** Soft warn when decoded pixels exceed this. */
export const IMAGE_WARN_MEGAPIXELS = 20;

/** Cap working bitmap long edge for interactive editing. */
export const IMAGE_WORKING_MAX_EDGE = 4096;

/** Max image layers on one canvas (including background). */
export const IMAGE_MAX_LAYERS = 12;

/** History stack depth. */
export const IMAGE_HISTORY_LIMIT = 40;

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, code: string, message: string }}
 */
export function validateImageFile(file) {
  if (!file) {
    return { ok: false, code: 'empty', message: 'No file provided.' };
  }
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const byMime = type.startsWith('image/');
  const byExt = IMAGE_ACCEPT_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!byMime && !byExt) {
    return { ok: false, code: 'type', message: 'Only image files are supported.' };
  }
  if (file.size > IMAGE_MAX_FILE_BYTES) {
    return { ok: false, code: 'size', message: 'File is larger than 40 MB.' };
  }
  return { ok: true };
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {{ megapixels: number, warn: boolean }}
 */
export function megapixelInfo(width, height) {
  const megapixels = (width * height) / 1_000_000;
  return { megapixels, warn: megapixels > IMAGE_WARN_MEGAPIXELS };
}
