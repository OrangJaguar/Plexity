import { useQuery } from '@tanstack/react-query';
import { listFeedback } from '@/api/entities/toolsFeedback';
import { useAuth } from '@/hooks/useAuth';

export function useAdminFeedback() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: listFeedback,
    enabled: isAdmin,
    staleTime: 15_000,
  });
}
