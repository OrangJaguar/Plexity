import { AuthRequiredError } from '@/api/auth';
import { getSupabase } from '@/api/supabaseClient';

const CACHE_MS = 60_000;

let cachedUser = null;
let cacheExpiry = 0;
let inflight = null;

export function clearAuthCache() {
  cachedUser = null;
  cacheExpiry = 0;
  inflight = null;
}

/**
 * App user shape for useAuth / RequireAdmin.
 * Admin role comes from public.profiles.role.
 */
export async function loadSupabaseAppUser() {
  const { data: sessionData, error: sessionError } = await getSupabase().auth.getSession();
  if (sessionError) throw sessionError;
  const sessionUser = sessionData.session?.user;
  if (!sessionUser?.id) return null;

  const { data: profile } = await getSupabase()
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', sessionUser.id)
    .maybeSingle();

  return {
    id: sessionUser.id,
    email: sessionUser.email || profile?.email || '',
    role: profile?.role || 'user',
    full_name: profile?.full_name
      || sessionUser.user_metadata?.full_name
      || sessionUser.user_metadata?.display_name,
  };
}

/** @returns {Promise<object | null>} */
export async function loadCurrentAppUser() {
  return loadSupabaseAppUser();
}

export async function requireAuth() {
  const now = Date.now();
  if (cachedUser && now < cacheExpiry) return cachedUser;

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const user = await loadCurrentAppUser();
      if (!user) throw new AuthRequiredError();
      cachedUser = user;
      cacheExpiry = Date.now() + CACHE_MS;
      return user;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export async function loginWithEmailPassword(email, password) {
  const { data, error } = await getSupabase().auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  clearAuthCache();
  return (await loadSupabaseAppUser()) ?? {
    id: data.user?.id,
    email: data.user?.email,
    role: 'user',
  };
}

/**
 * @returns {Promise<{ needsEmailConfirmation: boolean, user: object | null }>}
 */
export async function registerWithEmailPassword({ email, password, full_name }) {
  const { data, error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name },
    },
  });
  if (error) throw error;
  clearAuthCache();
  const needsEmailConfirmation = !data.session;
  const user = data.session ? await loadSupabaseAppUser() : null;
  return { needsEmailConfirmation, user };
}

export async function verifySignupOtp() {
  throw new Error('Email link confirmation is used instead of a code. Check your inbox, then sign in.');
}

export async function resendSignupVerification(email) {
  const { error } = await getSupabase().auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  if (error) throw error;
}

export async function signOutAuth() {
  const { error } = await getSupabase().auth.signOut();
  if (error) throw error;
  clearAuthCache();
}

export function passwordResetRedirectTo() {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}/reset-password`;
}
