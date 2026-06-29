import { useQuery } from '@tanstack/react-query';
import { listFocusSessions } from '@/api/entities/toolsFocusSessions';
import { useAuth } from '@/hooks/useAuth';

export function useToolsFocusSessions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['toolsFocusSessions'],
    queryFn: listFocusSessions,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}
