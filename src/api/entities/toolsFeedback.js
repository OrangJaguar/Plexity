import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';

export async function submitFeedback(payload) {
  await requireAuth();
  const res = await base44.functions.invoke('submitFeedback', payload);
  if (res?.error?.message) {
    throw new Error(res.error.message);
  }
  return res;
}

export async function listFeedback() {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  const rows = await base44.entities.ToolsFeedback.list('-createdAt', 500);
  return rows ?? [];
}

export async function updateFeedback(id, patch) {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return base44.entities.ToolsFeedback.update(id, {
    ...patch,
    updatedAt: Date.now(),
  });
}
