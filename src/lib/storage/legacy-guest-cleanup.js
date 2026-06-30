const LEGACY_GUEST_PREFIX = 'plexity.guest.';

/** Remove orphaned guest-mode keys after sign-in (pre-auth-required installs). */
export function clearLegacyGuestStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(LEGACY_GUEST_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}
