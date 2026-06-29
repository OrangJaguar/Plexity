import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

async function fetchCurrentUser() {
  const authed = await base44.auth.isAuthenticated();
  if (!authed) return null;
  return base44.auth.me();
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
}
