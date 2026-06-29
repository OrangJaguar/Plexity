import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { queryClient } from '@/lib/query-client';
import {
  activatePersistForUser,
  clearInMemoryUserQueries,
  clearLegacyPersistedCache,
  stopActivePersistSubscription,
} from '@/lib/query-persist';
import VeridianLoading from '@/components/shared/VeridianLoading';

/**
 * Restores React Query cache per authenticated user so accounts on the same
 * browser never share journeys, progress, or preferences.
 */
export default function QueryPersistManager({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const [sessionReady, setSessionReady] = useState(false);
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
      setSessionReady(true);
      return undefined;
    }

    let cancelled = false;

    if (!email) {
      stopActivePersistSubscription();
      clearInMemoryUserQueries(queryClient);
      clearLegacyPersistedCache();
      activeEmailRef.current = null;
      setSessionReady(true);
      return undefined;
    }

    setSessionReady(false);

    (async () => {
      try {
        await activatePersistForUser(queryClient, email);
      } catch {
        // Non-fatal — app will refetch from server.
      }
      if (!cancelled) {
        activeEmailRef.current = email;
        setSessionReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user?.email]);

  if (authLoading) {
    return <VeridianLoading fullPage />;
  }

  if (user && !sessionReady) {
    return <VeridianLoading fullPage />;
  }

  return children;
}
