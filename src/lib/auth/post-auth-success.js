import { toast } from 'sonner';
import { clearLegacyGuestStorage } from '@/lib/storage/legacy-guest-cleanup';
import { clearInMemoryUserQueries, clearLegacyPersistedCache } from '@/lib/query-persist';
import { queryClient } from '@/lib/query-client';

/** Refresh queries after sign-in / sign-up. */
export async function onAuthSuccess() {
  clearLegacyGuestStorage();
  clearInMemoryUserQueries(queryClient);
  clearLegacyPersistedCache();
  await queryClient.invalidateQueries();
  toast.success('Signed in — your workspace is ready.');
}
