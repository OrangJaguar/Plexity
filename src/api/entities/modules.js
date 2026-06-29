import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';

async function findByClientId(entity, field, value) {
  const rows = await entity.filter({ [field]: value });
  return rows[0] ?? null;
}

export async function listAllModules() {
  await requireAuth();
  return base44.entities.Module.list();
}

export async function listModulesByJourney(journeyId) {
  await requireAuth();
  const rows = await base44.entities.Module.filter({ journeyId });
  return rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getModule(moduleId) {
  await requireAuth();
  return findByClientId(base44.entities.Module, 'moduleId', moduleId);
}

export async function createModule(journeyId, payload) {
  const user = await requireAuth();
  return base44.entities.Module.create({
    ...payload,
    journeyId,
    userEmail: user.email,
    stage: payload.stage ?? 'A',
    masteryScore: payload.masteryScore ?? 0,
    libraryVisible: payload.libraryVisible ?? false,
    baselineSkipped: payload.baselineSkipped ?? false,
    baselineScore: payload.baselineScore ?? null,
    baselineCapturedAt: payload.baselineCapturedAt ?? null,
    firstQuizAt: payload.firstQuizAt ?? null,
  });
}

export async function createModules(journeyId, modules) {
  const user = await requireAuth();
  return Promise.all(
    modules.map((mod) =>
      base44.entities.Module.create({
        ...mod,
        journeyId,
        userEmail: user.email,
        stage: mod.stage ?? 'A',
        masteryScore: mod.masteryScore ?? 0,
        libraryVisible: mod.libraryVisible ?? false,
        baselineSkipped: mod.baselineSkipped ?? false,
        baselineScore: mod.baselineScore ?? null,
        baselineCapturedAt: mod.baselineCapturedAt ?? null,
        firstQuizAt: mod.firstQuizAt ?? null,
      }),
    ),
  );
}

export async function updateModule(moduleId, patch) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Module, 'moduleId', moduleId);
  if (!existing) throw new Error(`Module not found: ${moduleId}`);
  return base44.entities.Module.update(existing.id, patch);
}

export async function deleteModule(moduleId) {
  await requireAuth();
  const existing = await findByClientId(base44.entities.Module, 'moduleId', moduleId);
  if (!existing) return;
  await base44.entities.Module.delete(existing.id);
}

export async function deleteModulesByJourney(journeyId) {
  await requireAuth();
  const rows = await base44.entities.Module.filter({ journeyId });
  await Promise.all(rows.map((r) => base44.entities.Module.delete(r.id)));
}
