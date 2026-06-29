import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';

async function findByClientId(entity, field, value) {
  const rows = await entity.filter({ [field]: value });
  return rows[0] ?? null;
}

export async function listSessionsByJourney(journeyId) {
  await requireAuth();
  const rows = await base44.entities.Session.filter({ journeyId });
  return rows.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
}

export async function listAllSessions() {
  await requireAuth();
  return base44.entities.Session.list();
}

export async function getSession(sessionId) {
  await requireAuth();
  return findByClientId(base44.entities.Session, 'sessionId', sessionId);
}

export async function createSession(journeyId, payload) {
  const user = await requireAuth();
  return base44.entities.Session.create({
    ...payload,
    journeyId,
    userEmail: user.email,
    status: payload.status ?? 'completed',
    outcomeSummary: payload.outcomeSummary ?? {},
    sessionData: payload.sessionData ?? {},
  });
}

export async function updateSession(sessionId, patch) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Session, 'sessionId', sessionId);
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  return base44.entities.Session.update(existing.id, patch);
}

export async function deleteSession(sessionId) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Session, 'sessionId', sessionId);
  if (!existing) return;
  await base44.entities.Session.delete(existing.id);
}
