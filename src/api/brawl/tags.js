/**
 * Normalize Brawl Stars player/club tags for API paths.
 * Official API expects `%23TAG` (hash encoded).
 */

const TAG_CHARS = /^[0289PYLQGRJCUV]+$/i;

/**
 * @param {string | null | undefined} raw
 * @returns {string} bare tag without `#`, uppercased
 */
export function normalizeBrawlTag(raw) {
  const bare = String(raw ?? '').trim().replace(/^#/, '').toUpperCase();
  if (!bare) {
    const err = new Error('Player tag is required.');
    err.code = 'BRAWL_TAG_EMPTY';
    throw err;
  }
  if (!TAG_CHARS.test(bare)) {
    const err = new Error('Invalid tag. Use only characters allowed by Brawl Stars tags.');
    err.code = 'BRAWL_TAG_INVALID';
    throw err;
  }
  return bare;
}

/** @param {string | null | undefined} raw */
export function encodeBrawlTag(raw) {
  return `%23${normalizeBrawlTag(raw)}`;
}

/** @param {string | null | undefined} raw */
export function formatBrawlTagDisplay(raw) {
  try {
    return `#${normalizeBrawlTag(raw)}`;
  } catch {
    return '';
  }
}
