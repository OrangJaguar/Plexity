import { useQuery } from '@tanstack/react-query';
import { getOrCreateSchedule } from '@/api/entities/toolsSchedule';
import { queryKeys } from '@/api/query-keys';
import { localScheduleFallback } from '@/lib/tools/schedule-data';
import { useAuth } from '@/hooks/useAuth';

export function useToolsSchedule() {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.tools.schedule,
    queryFn: getOrCreateSchedule,
    enabled: isAuthenticated,
    placeholderData: localScheduleFallback,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
