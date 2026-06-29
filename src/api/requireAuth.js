import { base44 } from '@/api/base44Client';
import { AuthRequiredError } from '@/api/auth';

const CACHE_MS = 60_000;

let cachedUser = null;
let cacheExpiry = 0;
let inflight = null;

/**
 * Cached auth check — avoids isAuthenticated + me() on every entity call.
 */
export async function requireAuth() {
  const now = Date.now();
  if (cachedUser && now < cacheExpiry) return cachedUser;

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const authed = await base44.auth.isAuthenticated();
      if (!authed) throw new AuthRequiredError();
      const user = await base44.auth.me();
      cachedUser = user;
      cacheExpiry = Date.now() + CACHE_MS;
      return user;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function clearAuthCache() {
  cachedUser = null;
  cacheExpiry = 0;
  inflight = null;
}
