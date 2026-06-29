import { requireAuth } from '@/api/requireAuth';
import { safeCreate, safeDelete, safeFilter, safeList, safeUpdate } from '@/api/entities/toolsApi';
import { COMPLETED_RETENTION_MS } from '@/lib/tools/task-sort';

async function migrateManualSortOrder(rows) {
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
  return rows.map((t) =>
    t.manualSortOrder == null && t.sortOrder != null
      ? { ...t, manualSortOrder: t.sortOrder }
      : t,
  );
}

async function purgeExpiredCompleted(rows) {
  const cutoff = Date.now() - COMPLETED_RETENTION_MS;
  const expired = rows.filter(
    (t) => t.completed && (t.completedAt ?? 0) < cutoff,
  );
  if (!expired.length) return rows;
  await Promise.all(expired.map((t) => safeDelete('ToolsTask', t.id)));
  const expiredIds = new Set(expired.map((t) => t.taskId));
  return rows.filter((t) => !expiredIds.has(t.taskId));
}

export async function listTasks() {
  await requireAuth();
  let rows = await safeList('ToolsTask');
  rows = await purgeExpiredCompleted(rows);
  rows = await migrateManualSortOrder(rows);
  return rows;
}

export async function createTask(payload) {
  const user = await requireAuth();
  const now = Date.now();
  const taskId = payload.taskId || crypto.randomUUID();
  const manualSortOrder = payload.manualSortOrder ?? payload.sortOrder ?? now;
  return safeCreate('ToolsTask', {
    taskId,
    userEmail: user.email,
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
  });
}

export async function updateTask(taskId, patch) {
  await requireAuth();
  const rows = await safeFilter('ToolsTask', { taskId });
  const existing = rows[0];
  if (!existing) throw new Error(`Task not found: ${taskId}`);
  const next = { ...patch, updatedAt: Date.now() };
  if (patch.manualSortOrder != null) {
    next.sortOrder = patch.manualSortOrder;
  }
  return safeUpdate('ToolsTask', existing.id, next);
}

export async function deleteTask(taskId) {
  await requireAuth();
  const rows = await safeFilter('ToolsTask', { taskId });
  const existing = rows[0];
  if (!existing) return;
  await safeDelete('ToolsTask', existing.id);
}

export async function deleteRecurringFuture(taskId) {
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
  await requireAuth();
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
