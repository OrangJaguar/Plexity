import { requireAuth } from '@/api/requireAuth';
import { invokeBackendFunction } from '@/api/functions/invoke';
import { adminListFeedback, adminUpdateFeedback } from '@/api/admin/admin-api';

export async function submitFeedback(payload) {
  await requireAuth();
  return invokeBackendFunction('submitFeedback', payload);
}

/** Admin-only — routed through adminApi / admin-api gateway. */
export async function listFeedback() {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return adminListFeedback();
}

/** Admin-only — routed through adminApi / admin-api gateway. */
export async function updateFeedback(id, patch) {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return adminUpdateFeedback(id, patch);
}
