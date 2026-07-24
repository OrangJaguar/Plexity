/** Characters invalid in file names on common desktop OSes. */
const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

/** Default max visible characters for editable display titles. */
export const DISPLAY_NAME_MAX_LENGTH = 48;

/**
 * Sanitize a user-editable display name (not necessarily including extension).
 * Strips invalid filename characters and caps length.
 * @param {string} value
 * @param {number} [maxLength]
 * @returns {string}
 */
export function sanitizeDisplayName(value, maxLength = DISPLAY_NAME_MAX_LENGTH) {
  const cleaned = String(value ?? '')
    .replace(INVALID_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 'untitled';
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.slice(0, maxLength);
}

/**
 * Sanitize while typing — allows partial input (no trim-only collapse).
 * @param {string} value
 * @param {number} [maxLength]
 * @returns {string}
 */
export function sanitizeDisplayNameInput(value, maxLength = DISPLAY_NAME_MAX_LENGTH) {
  const cleaned = String(value ?? '')
    .replace(INVALID_CHARS, '')
    .replace(/\s+/g, ' ');
  return cleaned.slice(0, maxLength);
}

/**
 * One-line meta suffix for title bars: "768 × 1024 px · 167 KB"
 * @param {string[]} parts
 * @returns {string}
 */
export function formatTitleMetaLine(parts) {
  return parts.filter(Boolean).join(' · ');
}
