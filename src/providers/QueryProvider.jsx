import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';

/** Provides the shared React Query client. Per-user persistence is handled by QueryPersistManager. */
export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
