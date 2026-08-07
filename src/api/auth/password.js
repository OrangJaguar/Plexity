import { getSupabase } from '@/api/supabaseClient';
import { clearAuthCache, passwordResetRedirectTo } from '@/api/auth/session';

export async function requestPasswordReset(email) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordResetRedirectTo(),
  });
  if (error) throw error;
}

export async function completePasswordReset({ newPassword }) {
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
  clearAuthCache();
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data: sessionData } = await getSupabase().auth.getSession();
  const email = sessionData.session?.user?.email;
  if (!email) throw new Error('Not signed in.');
  const { error: reauthError } = await getSupabase().auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) throw reauthError;
  const { error } = await getSupabase().auth.updateUser({ password: newPassword });
  if (error) throw error;
  clearAuthCache();
}
