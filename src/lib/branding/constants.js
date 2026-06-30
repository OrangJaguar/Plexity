export const SITE_NAME = 'Plexity';
export const SITE_TAGLINE = 'A free, no-AI student workspace — tools rebuilt cleaner, in one place.';
export const SUPPORT_EMAIL = 'support.plexity@gmail.com';
/** White P on transparent — use in dark mode UI chrome */
export const LOGO_PATH_DARK = '/plexity-logo-dark.png';
/** Black P on transparent — use in light mode UI chrome */
export const LOGO_PATH_LIGHT = '/plexity-logo-light.png';
/** White P on black square — social / OG fallback */
export const LOGO_PATH_DARK_BG = '/plexity-logo-dark-bg.png';
/** Black P on white square — social / OG fallback */
export const LOGO_PATH_LIGHT_BG = '/plexity-logo-light-bg.png';

export function logoPathForTheme(dark) {
  return dark ? LOGO_PATH_DARK : LOGO_PATH_LIGHT;
}
export const REQUEST_ID_PREFIX = 'PLX';
export const STORAGE_PREFIX = 'plexity';

export const DEFAULT_PAGE_DESCRIPTION =
  'Plexity — a student productivity suite with tasks, calendar, focus, and more.';