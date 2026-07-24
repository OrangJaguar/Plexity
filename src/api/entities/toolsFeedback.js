import { requireAuth } from '@/api/requireAuth';
import { unwrapFunctionInvoke } from '@/api/tools/invoke-response';
import { base44 } from '@/api/base44Client';
import { adminListFeedback, adminUpdateFeedback } from '@/api/admin/admin-api';

export async function submitFeedback(payload) {
  await requireAuth();
  const res = await base44.functions.invoke('submitFeedback', payload);
  return unwrapFunctionInvoke(res);
}

/** Admin-only — routed through the Base44 adminApi gateway. */
export async function listFeedback() {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return adminListFeedback();
}

/** Admin-only — routed through the Base44 adminApi gateway. */
export async function updateFeedback(id, patch) {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return adminUpdateFeedback(id, patch);
}
