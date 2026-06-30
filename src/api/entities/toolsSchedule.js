import { requireAuth } from '@/api/requireAuth';
import { normalizeSchedule } from '@/lib/tools/schedule-data';
import { hasToolsEntity, safeCreate, safeFilter, safeUpdate } from '@/api/entities/toolsApi';

function emptySchedule() {
  return {
    weekday: [],
    wednesday: [],
    exceptions: [],
    recurringBlocks: [],
    updatedAt: Date.now(),
  };
}

export async function getOrCreateSchedule() {
  await requireAuth();

  if (!hasToolsEntity('ToolsSchedule')) {
    console.warn('[tools] ToolsSchedule entity missing — using local default schedule');
    return normalizeSchedule(null);
  }

  try {
    const user = await requireAuth();
    const rows = await safeFilter('ToolsSchedule', { userEmail: user.email });
    if (rows.length > 0) {
      return normalizeSchedule(rows[0]);
    }
    const now = Date.now();
    const created = await safeCreate('ToolsSchedule', {
      userEmail: user.email,
      ...emptySchedule(),
      updatedAt: now,
    });
    return normalizeSchedule(created);
  } catch (err) {
    console.warn('[tools] getOrCreateSchedule failed — using defaults', err);
    return normalizeSchedule(null);
  }
}

export async function updateSchedule(patch) {
  const user = await requireAuth();
  const rows = await safeFilter('ToolsSchedule', { userEmail: user.email });
  const existing = rows[0];
  if (!existing?.id) {
    throw new Error('No schedule row to update');
  }
  return safeUpdate('ToolsSchedule', existing.id, {
    ...patch,
    updatedAt: Date.now(),
  });
}
