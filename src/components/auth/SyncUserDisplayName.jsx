import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { syncAuthUserFullName, refreshAuthUser } from '@/api/auth/userProfile';
import { authNameNeedsUsernameSync } from '@/utils/userDisplayName';

/** One-time repair: sync UserPreferences.username → User.full_name for legacy signups. */
export default function SyncUserDisplayName() {
  const { user, setUser } = useAuth();
  const { data: preferences } = usePreferences();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!user || !preferences?.username || syncingRef.current) return;
    if (!authNameNeedsUsernameSync(user, preferences)) return;

    syncingRef.current = true;
    syncAuthUserFullName(preferences.username)
      .then(() => refreshAuthUser())
      .then((refreshed) => {
        if (refreshed) setUser(refreshed);
      })
      .catch(() => {})
      .finally(() => {
        syncingRef.current = false;
      });
  }, [user, preferences?.username, setUser]);

  return null;
}
