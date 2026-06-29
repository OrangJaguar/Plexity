import { toast } from 'sonner';
import { clearGuestStorage } from '@/lib/storage/guest-store';
import { clearInMemoryUserQueries, clearLegacyPersistedCache } from '@/lib/query-persist';
import { queryClient } from '@/lib/query-client';

/** Wipe guest local data and refresh queries after sign-in / sign-up. */
export async function onAuthSuccess() {
  clearGuestStorage();
  clearInMemoryUserQueries(queryClient);
  clearLegacyPersistedCache();
  await queryClient.invalidateQueries();
  toast.info(
    'Signed in — your cloud workspace is ready. Local data from this browser wasn\'t transferred.',
  );
}
