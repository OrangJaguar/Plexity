import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';

async function findByClientId(entity, field, value) {
  const rows = await entity.filter({ [field]: value });
  return rows[0] ?? null;
}

export async function listAllActivities() {
  await requireAuth();
  return base44.entities.Activity.list();
}

export async function listActivitiesByJourney(journeyId) {
  await requireAuth();
  return base44.entities.Activity.filter({ journeyId });
}

export async function listActivitiesByModule(moduleId) {
  await requireAuth();
  return base44.entities.Activity.filter({ moduleId });
}

export async function getActivity(activityId) {
  await requireAuth();
  return findByClientId(base44.entities.Activity, 'activityId', activityId);
}

export async function createActivity(journeyId, payload) {
  const user = await requireAuth();
  const now = Date.now();
  return base44.entities.Activity.create({
    ...payload,
    journeyId,
    userEmail: user.email,
    moduleId: payload.moduleId ?? null,
    content: payload.content ?? {},
    stats: payload.stats ?? {},
    itemCount: payload.itemCount ?? 0,
    createdAt: payload.createdAt ?? now,
    updatedAt: payload.updatedAt ?? now,
    libraryVisible: payload.libraryVisible ?? false,
  });
}

export async function updateActivity(activityId, patch) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Activity, 'activityId', activityId);
  if (!existing) throw new Error(`Activity not found: ${activityId}`);
  return base44.entities.Activity.update(existing.id, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteActivity(activityId) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Activity, 'activityId', activityId);
  if (!existing) return;
  await base44.entities.Activity.delete(existing.id);
}
