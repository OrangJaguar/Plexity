import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { getPreferences } from '@/api/entities/preferences';
import { useAuth } from '@/hooks/useAuth';
import { mergePreferencesWithLocalPins } from '@/lib/tools/persist-pinned-tools';
import { mergePreferencesWithLocalToolsSettings } from '@/lib/tools/persist-tools-settings';

export function usePreferences() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: queryKeys.preferences(user?.email),
    queryFn: async () => {
      const server = await getPreferences();
      return mergePreferencesWithLocalToolsSettings(mergePreferencesWithLocalPins(server));
    },
    enabled: isAuthenticated && !!user?.email,
    staleTime: 60_000,
  });
}
