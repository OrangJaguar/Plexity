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
  const user = await requireAuth();
  const now = Date.now();
  const sessionId = payload.sessionId || crypto.randomUUID();
  const row = {
    id: sessionId,
    userEmail: user.email,
    sessionId,
    createdAt: now,
    ...payload,
  };

  try {
    if (!hasToolsEntity('ToolsFocusSession')) {
      return { ...row, id: 'local' };
    }
    return safeCreate('ToolsFocusSession', row);
  } catch {
    return { ...row, id: 'local' };
  }
}

export async function countFocusSessionsToday() {
  const sessions = await listFocusSessions();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return sessions.filter((s) => (s.startedAt ?? 0) >= start.getTime()).length;
}
