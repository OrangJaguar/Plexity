import { createContext, useCallback, useEffect, useMemo } from 'react';
import { queryClient } from '@/lib/query-client';
import { clearAuthCache, loadCurrentAppUser, signOutAuth } from '@/api/auth/session';
import { getSupabase, isSupabaseConfigured } from '@/api/supabaseClient';
import { touchLastActive } from '@/api/entities/preferences';
import { useCurrentUser } from '@/hooks/queries/useCurrentUser';
import {
  clearInMemoryUserQueries,
  clearLegacyPersistedCache,
  stopActivePersistSubscription,
} from '@/lib/query-persist';

export const AuthContext = createContext(null);

if (typeof window !== 'undefined' && !window.__plexityAuthCallbacks) {
  window.__plexityAuthCallbacks = { onUserLoaded: null };
}

export default function AuthProvider({ children }) {
  const { data: user, isLoading, refetch } = useCurrentUser();

  useEffect(() => {
    window.__plexityAuthCallbacks.onUserLoaded = (u) => {
      queryClient.setQueryData(['auth', 'me'], u ?? null);
    };
    return () => {
      window.__plexityAuthCallbacks.onUserLoaded = null;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) return undefined;
    const { data: sub } = getSupabase().auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        clearAuthCache();
        queryClient.setQueryData(['auth', 'me'], null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        clearAuthCache();
        const next = await loadCurrentAppUser();
        queryClient.setQueryData(['auth', 'me'], next ?? null);
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user?.email) {
      touchLastActive().catch(() => {});
    }
  }, [user?.email]);

  const setUser = useCallback((nextUser) => {
    queryClient.setQueryData(['auth', 'me'], nextUser ?? null);
  }, []);

  const refreshUser = useCallback(() => refetch(), [refetch]);

  const signOut = useCallback(async () => {
    stopActivePersistSubscription();
    await signOutAuth();
    clearAuthCache();
    clearInMemoryUserQueries(queryClient);
    clearLegacyPersistedCache();
    queryClient.setQueryData(['auth', 'me'], null);
    queryClient.removeQueries({ queryKey: ['auth'] });
  }, []);

  const value = useMemo(() => ({
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    setUser,
    refreshUser,
    signOut,
  }), [user, isLoading, setUser, refreshUser, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
