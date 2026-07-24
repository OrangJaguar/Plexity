const P = 'plexity';

export const STORAGE_KEYS = {
  prefs: `${P}.prefs`,
  /** Local cache of pinned tool IDs (also mirrored in preferences). */
  pinnedToolIds: `${P}.pinnedToolIds`,
  /** Flag that a Video IndexedDB session may exist (UI hint only). */
  videoSessionHint: `${P}.video.sessionHint`,
};

/** Accidental key from STORAGE_KEYS.pinnedToolIds before the key existed. */
export const LEGACY_PINNED_TOOL_IDS_KEY = 'undefined';

/**
 * Migrate accidental `"undefined"` localStorage pin cache into the real key once.
 * Safe to call on app boot / pin hydrate.
 */
export function migrateLegacyPinnedToolIdsKey() {
  try {
    if (typeof localStorage === 'undefined') return;
    const legacy = localStorage.getItem(LEGACY_PINNED_TOOL_IDS_KEY);
    if (legacy === null) return;
    const current = localStorage.getItem(STORAGE_KEYS.pinnedToolIds);
    if (current === null) {
      localStorage.setItem(STORAGE_KEYS.pinnedToolIds, legacy);
    }
    localStorage.removeItem(LEGACY_PINNED_TOOL_IDS_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Legacy localStorage key after migrating a tool document to Base44. */
export function migratedKey(entityName) {
  return `${P}.migrated.${entityName}`;
}
