import { requireAuth } from '@/api/requireAuth';
import { hasToolsEntity, safeCreate, safeList } from '@/api/entities/toolsApi';

export async function listFocusSessions() {
  await requireAuth();
  if (!hasToolsEntity('ToolsFocusSession')) return [];
  try {
    const rows = await safeList('ToolsFocusSession');
    return rows.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
  } catch {
    return [];
  }
}

export async function createFocusSession(payload) {
  try {
    const user = await requireAuth();
    if (!hasToolsEntity('ToolsFocusSession')) {
      return { ...payload, id: 'local' };
    }
    const now = Date.now();
    return safeCreate('ToolsFocusSession', {
      userEmail: user.email,
      sessionId: payload.sessionId || crypto.randomUUID(),
      createdAt: now,
      ...payload,
    });
  } catch {
    return { ...payload, id: 'local' };
  }
}

export async function countFocusSessionsToday() {
  const sessions = await listFocusSessions();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return sessions.filter((s) => (s.startedAt ?? 0) >= start.getTime()).length;
}
