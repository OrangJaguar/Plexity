import { requireAuth } from '@/api/requireAuth';
import { getStorageContext } from '@/api/storage-context';
import { safeCreate, safeDelete, safeFilter, safeList, safeUpdate } from '@/api/entities/toolsApi';
import { COMPLETED_RETENTION_MS } from '@/lib/tools/task-sort';
import {
  GUEST_KEYS,
  guestDeleteBy,
  guestFindBy,
  guestUpsertBy,
  readGuestArray,
  writeGuestArray,
} from '@/lib/storage/guest-store';

function migrateManualSortOrderSync(rows) {
  return rows.map((t) =>
    t.manualSortOrder == null && t.sortOrder != null
      ? { ...t, manualSortOrder: t.sortOrder }
      : t,
  );
}

async function migrateManualSortOrder(rows, mode) {
  if (mode === 'guest') return migrateManualSortOrderSync(rows);
  const needsMigration = rows.filter(
    (t) => t.manualSortOrder == null && t.sortOrder != null,
  );
  if (!needsMigration.length) return rows;
  await Promise.all(
    needsMigration.map((t) =>
      safeUpdate('ToolsTask', t.id, {
        manualSortOrder: t.sortOrder,
        updatedAt: Date.now(),
      }),
    ),
  );
  return migrateManualSortOrderSync(rows);
}

async function purgeExpiredCompleted(rows, mode) {
  const cutoff = Date.now() - COMPLETED_RETENTION_MS;
  const expired = rows.filter(
    (t) => t.completed && (t.completedAt ?? 0) < cutoff,
  );
  if (!expired.length) return rows;
  if (mode === 'guest') {
    const expiredIds = new Set(expired.map((t) => t.taskId));
    return rows.filter((t) => !expiredIds.has(t.taskId));
  }
  await Promise.all(expired.map((t) => safeDelete('ToolsTask', t.id)));
  const expiredIds = new Set(expired.map((t) => t.taskId));
  return rows.filter((t) => !expiredIds.has(t.taskId));
}

export async function listTasks() {
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') {
    let rows = readGuestArray(GUEST_KEYS.tasks);
    rows = await purgeExpiredCompleted(rows, 'guest');
    rows = migrateManualSortOrderSync(rows);
    if (rows.length !== readGuestArray(GUEST_KEYS.tasks).length) {
      writeGuestArray(GUEST_KEYS.tasks, rows);
    }
    return rows;
  }
  await requireAuth();
  let rows = await safeList('ToolsTask');
  rows = await purgeExpiredCompleted(rows, 'cloud');
  rows = await migrateManualSortOrder(rows, 'cloud');
  return rows;
}

export async function createTask(payload) {
  const ctx = await getStorageContext();
  const now = Date.now();
  const taskId = payload.taskId || crypto.randomUUID();
  const manualSortOrder = payload.manualSortOrder ?? payload.sortOrder ?? now;
  const row = {
    id: taskId,
    taskId,
    userEmail: ctx.mode === 'cloud' ? ctx.userEmail : 'guest@local',
    title: payload.title,
    due: payload.due || '',
    priority: payload.priority || 'medium',
    className: payload.className || '',
    notes: payload.notes || '',
    type: payload.type || 'task',
    estimatedMinutes: payload.estimatedMinutes ?? null,
    subtasks: payload.subtasks || [],
    recurrenceRule: payload.recurrenceRule || null,
    recurrenceParentId: payload.recurrenceParentId || '',
    completed: false,
    sortOrder: manualSortOrder,
    manualSortOrder,
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
  };

  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.tasks);
    writeGuestArray(GUEST_KEYS.tasks, [...rows, row]);
    return row;
  }

  const user = await requireAuth();
  return safeCreate('ToolsTask', { ...row, userEmail: user.email });
}

export async function updateTask(taskId, patch) {
  const ctx = await getStorageContext();
  const next = { ...patch, updatedAt: Date.now() };
  if (patch.manualSortOrder != null) {
    next.sortOrder = patch.manualSortOrder;
  }

  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.tasks);
    const existing = guestFindBy(rows, 'taskId', taskId);
    if (!existing) throw new Error(`Task not found: ${taskId}`);
    const updated = guestUpsertBy(rows, 'taskId', taskId, { ...existing, ...next });
    writeGuestArray(GUEST_KEYS.tasks, updated);
    return guestFindBy(updated, 'taskId', taskId);
  }

  await requireAuth();
  const rows = await safeFilter('ToolsTask', { taskId });
  const existing = rows[0];
  if (!existing) throw new Error(`Task not found: ${taskId}`);
  return safeUpdate('ToolsTask', existing.id, next);
}

export async function deleteTask(taskId) {
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.tasks);
    writeGuestArray(GUEST_KEYS.tasks, guestDeleteBy(rows, 'taskId', taskId));
    return;
  }
  await requireAuth();
  const rows = await safeFilter('ToolsTask', { taskId });
  const existing = rows[0];
  if (!existing) return;
  await safeDelete('ToolsTask', existing.id);
}

export async function deleteRecurringFuture(taskId) {
  const ctx = await getStorageContext();
  if (ctx.mode === 'guest') {
    const rows = readGuestArray(GUEST_KEYS.tasks);
    const existing = guestFindBy(rows, 'taskId', taskId);
    if (!existing) return;
    const parentId = existing.recurrenceParentId || existing.taskId;
    const filtered = rows.filter(
      (t) =>
        t.taskId !== taskId
        && t.recurrenceParentId !== parentId
        && t.taskId !== parentId,
    );
    writeGuestArray(GUEST_KEYS.tasks, filtered);
    return;
  }
  await requireAuth();
  const rows = await safeFilter('ToolsTask', { taskId });
  const existing = rows[0];
  if (!existing) return;
  const parentId = existing.recurrenceParentId || existing.taskId;
  const all = await safeList('ToolsTask');
  const toDelete = all.filter(
    (t) =>
      t.taskId === taskId
      || t.recurrenceParentId === parentId
      || t.taskId === parentId,
  );
  await Promise.all(toDelete.map((t) => safeDelete('ToolsTask', t.id)));
}

export async function reorderTasks(orderUpdates) {
  await Promise.all(
    orderUpdates.map(({ taskId, manualSortOrder, sortOrder }) =>
      updateTask(taskId, {
        manualSortOrder: manualSortOrder ?? sortOrder,
      }),
    ),
  );
}

export function buildManualReorder(activeTasks, dragId, targetId) {
  const ids = activeTasks.map((t) => t.taskId);
  const from = ids.indexOf(dragId);
  const to = ids.indexOf(targetId);
  if (from < 0 || to < 0) return null;
  ids.splice(from, 1);
  ids.splice(to, 0, dragId);
  return ids.map((taskId, i) => ({ taskId, manualSortOrder: i }));
}
