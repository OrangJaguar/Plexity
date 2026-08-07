import { useQuery } from '@tanstack/react-query';
import { loadCurrentAppUser } from '@/api/auth/session';

async function fetchCurrentUser() {
  return loadCurrentAppUser();
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    staleTime: 60_000,
  });
}
