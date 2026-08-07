import { createClient } from '@supabase/supabase-js';
import { supabaseParams } from '@/lib/app-params';

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

/**
 * Browser Supabase client (anon key). Lazy so Base44-only local env
 * does not crash on import when VITE_SUPABASE_* are unset.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabase() {
  if (client) return client;

  const { url, anonKey } = supabaseParams;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env',
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.__plexitySupabase = client;
  }

  return client;
}

/** True when URL + anon key are present (does not validate credentials). */
export function isSupabaseConfigured() {
  return Boolean(supabaseParams.url && supabaseParams.anonKey);
}
