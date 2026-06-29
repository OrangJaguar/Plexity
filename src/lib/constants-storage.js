// Re-export from centralized branding + storage modules.
import { STORAGE_KEYS } from '@/lib/storage/storage-keys';

export { SITE_NAME, SITE_TAGLINE, SUPPORT_EMAIL, LOGO_PATH, REQUEST_ID_PREFIX, STORAGE_PREFIX, DEFAULT_PAGE_DESCRIPTION } from '@/lib/branding/constants';
export { STORAGE_KEYS, GUEST_PREFIX, GUEST_ENTITY_KEYS, migratedKey, queryCacheKeyForEmail, passwordsKeyForUser } from '@/lib/storage/storage-keys';

export const PREFS_KEY = STORAGE_KEYS.preferences;
