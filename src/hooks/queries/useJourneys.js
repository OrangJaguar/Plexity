import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { listJourneys, getJourney } from '@/api/entities/journeys';
import { useAuth } from '@/hooks/useAuth';

export function useJourneys({ archived = false } = {}) {
  const { isAuthenticated } = useAuth();
  const key = archived ? queryKeys.journeys.archived : queryKeys.journeys.all;

  return useQuery({
    queryKey: key,
    queryFn: () => listJourneys({ archived }),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function useJourney(journeyId) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: queryKeys.journeys.detail(journeyId),
    queryFn: () => getJourney(journeyId),
    enabled: isAuthenticated && !!journeyId,
    staleTime: 30_000,
  });
}
