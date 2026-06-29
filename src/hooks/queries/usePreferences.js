import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { getPreferences } from '@/api/entities/preferences';
import { useAuth } from '@/hooks/useAuth';
import { mergePreferencesWithLocalPins } from '@/lib/tools/persist-pinned-tools';
import { mergePreferencesWithLocalToolsSettings } from '@/lib/tools/persist-tools-settings';

export function usePreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.preferences(user?.email ?? 'guest'),
    queryFn: async () => {
      const server = await getPreferences();
      return mergePreferencesWithLocalToolsSettings(mergePreferencesWithLocalPins(server));
    },
    enabled: true,
    staleTime: 60_000,
  });
}
