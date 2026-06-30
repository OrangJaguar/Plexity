import { requireAuth } from '@/api/requireAuth';

/** Signed-in cloud storage context (tools require authentication). */
export async function getStorageContext() {
  const user = await requireAuth();
  return { mode: 'cloud', userEmail: user.email };
}
