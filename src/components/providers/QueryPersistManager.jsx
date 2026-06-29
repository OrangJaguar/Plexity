import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/query-client';
import AppLoading from '@/components/shared/AppLoading';
import {
  activatePersistForUser,
  clearInMemoryUserQueries,
  clearLegacyPersistedCache,
  stopActivePersistSubscription,
} from '@/lib/query-persist';

/**
 * Clears cross-account in-memory cache on sign-in/out. Disk persistence is disabled
 * for Plexity — data lives in Base44 entities or localStorage per tool.
 */
export default function QueryPersistManager({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const activeEmailRef = useRef(null);
  const initLegacyClearedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return undefined;

    const email = user?.email ?? null;

    if (!initLegacyClearedRef.current) {
      initLegacyClearedRef.current = true;
      clearLegacyPersistedCache();
    }

    if (email === activeEmailRef.current) {
      return undefined;
    }

    let cancelled = false;

    if (!email) {
      stopActivePersistSubscription();
      clearInMemoryUserQueries(queryClient);
      clearLegacyPersistedCache();
      activeEmailRef.current = null;
      return undefined;
    }

    (async () => {
      try {
        await activatePersistForUser(queryClient, email);
      } catch {
        // Non-fatal — app will refetch from server.
      }
      if (!cancelled) {
        activeEmailRef.current = email;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.email]);

  if (authLoading) {
    return <AppLoading fullPage />;
  }

  return children;
}
