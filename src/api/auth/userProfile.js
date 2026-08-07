import { getSupabase } from '@/api/supabaseClient';
import { clearAuthCache, loadCurrentAppUser, loadSupabaseAppUser } from '@/api/auth/session';
import { normalizeUsername } from '@/utils/schemas/preferences';

/**
 * Sync display name to user_metadata + profiles.full_name.
 */
export async function syncAuthUserFullName(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return null;

  const { data: sessionData } = await getSupabase().auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) return null;

  const { error: metaError } = await getSupabase().auth.updateUser({
    data: { full_name: normalized },
  });
  if (metaError) throw metaError;

  await getSupabase()
    .from('profiles')
    .update({
      full_name: normalized,
      updated_at: Date.now(),
    })
    .eq('id', userId);

  clearAuthCache();
  return loadSupabaseAppUser();
}

export async function refreshAuthUser() {
  clearAuthCache();
  return loadCurrentAppUser();
}
