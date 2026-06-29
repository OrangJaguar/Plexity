import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';

async function findByClientId(entity, field, value) {
  const rows = await entity.filter({ [field]: value });
  return rows[0] ?? null;
}

export async function listJourneys({ archived = false } = {}) {
  await requireAuth();
  const rows = await base44.entities.Journey.list();
  return rows.filter((j) => !!j.archived === archived);
}

export async function getJourney(journeyId) {
  await requireAuth();
  return findByClientId(base44.entities.Journey, 'journeyId', journeyId);
}

export async function createJourney(payload) {
  const user = await requireAuth();
  const now = Date.now();
  return base44.entities.Journey.create({
    ...payload,
    userEmail: user.email,
    isPublic: payload.isPublic ?? false,
    archived: payload.archived ?? false,
    diagnosticSkipped: payload.diagnosticSkipped ?? false,
    sources: payload.sources ?? [],
    tags: payload.tags ?? [],
    cloneCount: payload.cloneCount ?? 0,
    ratingSum: payload.ratingSum ?? 0,
    ratingCount: payload.ratingCount ?? 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateJourney(journeyId, patch) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Journey, 'journeyId', journeyId);
  if (!existing) throw new Error(`Journey not found: ${journeyId}`);
  return base44.entities.Journey.update(existing.id, {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function deleteJourney(journeyId) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Journey, 'journeyId', journeyId);
  if (!existing) return;
  await base44.entities.Journey.delete(existing.id);
}
