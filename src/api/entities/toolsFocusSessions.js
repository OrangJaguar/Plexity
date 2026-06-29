import { requireAuth } from '@/api/requireAuth';
import { getStorageContext } from '@/api/storage-context';
import { hasToolsEntity, safeCreate, safeList } from '@/api/entities/toolsApi';
import {
  GUEST_KEYS,
  readGuestArray,
  writeGuestArray,
} from '@/lib/storage/guest-store';

export async function listFocusSessions() {
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') {
    return readGuestArray(GUEST_KEYS.focus)
      .sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
  }
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
  const ctx = await getStorageContext();
  const now = Date.now();
  const sessionId = payload.sessionId || crypto.randomUUID();
  const row = {
    id: sessionId,
    userEmail: ctx.mode === 'cloud' ? ctx.userEmail : 'guest@local',
    sessionId,
    createdAt: now,
    ...payload,
  };

  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.focus);
    writeGuestArray(GUEST_KEYS.focus, [...rows, row]);
    return row;
  }

  try {
    const user = await requireAuth();
    if (!hasToolsEntity('ToolsFocusSession')) {
      return { ...payload, id: 'local' };
    }
    return safeCreate('ToolsFocusSession', {
      ...row,
      userEmail: user.email,
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
