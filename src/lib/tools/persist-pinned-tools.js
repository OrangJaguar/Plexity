import { queryKeys } from '@/api/query-keys';
import { updatePreferences } from '@/api/entities/preferences';
import {
  getDefaultPinnedToolIds,
  readPinnedToolIdsFromStorage,
  sanitizePinnedToolIds,
  writePinnedToolIdsToStorage,
} from '@/lib/tools/pinned-tools';

/** Merge server preferences with local pinned-tool state for the query cache. */
export function mergePreferencesWithLocalPins(data) {
  if (!data) return data;
  const stored = readPinnedToolIdsFromStorage();
  const ids = stored
    ?? sanitizePinnedToolIds(data.pinnedToolIds)
    ?? getDefaultPinnedToolIds();
  return { ...data, pinnedToolIds: ids };
}

/** @param {import('@tanstack/react-query').QueryClient} queryClient */
export function getPinnedIdsFromCache(queryClient, preferencesKey) {
  const current = queryClient.getQueryData(preferencesKey);
  const fromCache = sanitizePinnedToolIds(current?.pinnedToolIds);
  if (fromCache !== null) return fromCache;

  const stored = readPinnedToolIdsFromStorage();
  if (stored !== null) return stored;

  return getDefaultPinnedToolIds();
}

/**
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {readonly unknown[]} preferencesKey
 * @param {string[]} nextIds
 */
export function applyPinnedToolIds(queryClient, preferencesKey, nextIds) {
  writePinnedToolIdsToStorage(nextIds);
  queryClient.setQueryData(preferencesKey, (old) => (
    old ? { ...old, pinnedToolIds: nextIds } : { pinnedToolIds: nextIds }
  ));
}

/** Best-effort server sync; never throws. */
export async function syncPinnedToolIdsToServer(nextIds) {
  try {
    await updatePreferences({ pinnedToolIds: nextIds });
  } catch {
    /* localStorage + cache remain source of truth until base44 field is deployed */
  }
}

export { queryKeys };
