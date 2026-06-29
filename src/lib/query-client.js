import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    },
  },
});
