/**
 * Data backend for Plexity. Supabase is the only supported provider after migration.
 * VITE_DATA_PROVIDER may still be set for clarity; non-supabase values are ignored.
 */

/** @typedef {'supabase'} DataProvider */

/**
 * @returns {DataProvider}
 */
export function getDataProvider() {
  return 'supabase';
}

export function isSupabaseProvider() {
  return true;
}

/** @deprecated Base44 runtime removed — always false. */
export function isBase44Provider() {
  return false;
}
