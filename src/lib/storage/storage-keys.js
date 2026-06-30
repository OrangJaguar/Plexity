const P = 'plexity';

export const STORAGE_KEYS = {
  prefs: `${P}.prefs`,
};

/** Legacy localStorage key after migrating a tool document to Base44. */
export function migratedKey(entityName) {
  return `${P}.migrated.${entityName}`;
}
