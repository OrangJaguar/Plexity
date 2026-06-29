import { useQuery } from '@tanstack/react-query';
import { listFocusSessions } from '@/api/entities/toolsFocusSessions';

export function useToolsFocusSessions() {
  return useQuery({
    queryKey: ['toolsFocusSessions'],
    queryFn: listFocusSessions,
    enabled: true,
    staleTime: 30_000,
  });
}
