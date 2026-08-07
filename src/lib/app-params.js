const trimEnv = (value) => {
	if (value == null) return '';
	return String(value).trim();
};

/** Supabase browser config (Vite-exposed). Service role must never live here. */
export const supabaseParams = {
	url: trimEnv(import.meta.env.VITE_SUPABASE_URL),
	anonKey: trimEnv(import.meta.env.VITE_SUPABASE_ANON_KEY),
};
