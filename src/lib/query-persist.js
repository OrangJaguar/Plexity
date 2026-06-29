/** @deprecated Legacy global key — removed on session init so accounts never share cache. */
export const LEGACY_PERSIST_CACHE_KEY = 'veridian-query-cache';

export const PERSIST_CACHE_BUSTER = 'phase3-user-scoped-v1';

export const persistableQueryKeys = new Set([
  'journeys',
  'modules',
  'activities',
  'cards',
  'dueToday',
  'preferences',
  'studyPlan',
]);

export function shouldPersistQuery(query) {
  const root = query.queryKey?.[0];
  return typeof root === 'string' && persistableQueryKeys.has(root);
}

export function getPersistCacheKey(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return `veridian-query-cache:${encodeURIComponent(normalized)}`;
}

export function clearLegacyPersistedCache() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LEGACY_PERSIST_CACHE_KEY);
  } catch {
    // ignore quota errors
  }
}

export const defaultDehydrateOptions = {
  shouldDehydrateQuery: (query) => (
    query.state.status === 'success' && shouldPersistQuery(query)
  ),
};

/** In-memory query keys that hold per-user app data (not auth token). */
export const USER_SCOPED_QUERY_ROOTS = [
  'journeys',
  'modules',
  'activities',
  'cards',
  'dueToday',
  'preferences',
  'studyPlan',
  'catalog',
  'library',
  'sessions',
  'profile',
];

export function clearInMemoryUserQueries(queryClient) {
  for (const root of USER_SCOPED_QUERY_ROOTS) {
    queryClient.removeQueries({ queryKey: [root] });
  }
}

let activePersistUnsubscribe = null;

export function stopActivePersistSubscription() {
  if (typeof activePersistUnsubscribe === 'function') {
    activePersistUnsubscribe();
  }
  activePersistUnsubscribe = null;
}

export function setActivePersistUnsubscribe(unsubscribe) {
  stopActivePersistSubscription();
  activePersistUnsubscribe = unsubscribe;
}

/**
 * Tools on Base44 sync via entities/localStorage — skip React Query disk persist
 * so we don't depend on optional @tanstack/query-persist-* packages at build time.
 */
export async function activatePersistForUser(queryClient, email) {
  stopActivePersistSubscription();
  clearInMemoryUserQueries(queryClient);
  clearLegacyPersistedCache();
  if (!email) return;
}
