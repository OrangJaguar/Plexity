import { base44 } from '@/api/base44Client';

/**
 * @returns {Promise<{ mode: 'cloud', userEmail: string } | { mode: 'guest' }>}
 */
export async function getStorageContext() {
  const authed = await base44.auth.isAuthenticated();
  if (authed) {
    const user = await base44.auth.me();
    return { mode: 'cloud', userEmail: user.email };
  }
  return { mode: 'guest' };
}
