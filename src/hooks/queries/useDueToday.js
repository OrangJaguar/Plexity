import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { fetchDueTodayItems } from '@/api/entities/dueToday';
import { useAuth } from '@/hooks/useAuth';

export function useDueToday() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.dueToday,
    queryFn: () => fetchDueTodayItems(queryClient),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
