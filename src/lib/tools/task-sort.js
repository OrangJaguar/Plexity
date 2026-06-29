import {
  COMPLETED_EXPIRY_WARNING_DAYS,
  COMPLETED_RETENTION_DAYS,
  PRIORITY_ORDER,
} from './constants';

const DAY_MS = 24 * 60 * 60 * 1000;

export const COMPLETED_RETENTION_MS = COMPLETED_RETENTION_DAYS * DAY_MS;
export const COMPLETED_EXPIRY_WARNING_MS = COMPLETED_EXPIRY_WARNING_DAYS * DAY_MS;

export function getEffectiveManualSortOrder(task) {
  if (task.manualSortOrder != null) return task.manualSortOrder;
  if (task.sortOrder != null) return task.sortOrder;
  return task.createdAt ?? 0;
}

export function hasCustomSortOrder(tasks) {
  return tasks.some((t) => t.manualSortOrder != null || t.sortOrder != null);
}

export function isTaskOverdue(task) {
  if (!task?.due || task.completed) return false;
  return new Date(task.due).getTime() < Date.now();
}

export function filterByCategories(tasks, selectedCategories) {
  if (!selectedCategories?.length) return tasks;
  return tasks.filter((t) => selectedCategories.includes(t.className || ''));
}

export function getActiveCategories(tasks) {
  const cats = new Set();
  (tasks || [])
    .filter((t) => t.type === 'task' && !t.completed)
    .forEach((t) => {
      if (t.className) cats.add(t.className);
    });
  return [...cats].sort((a, b) => a.localeCompare(b));
}

export function sortTasksByMode(tasks, mode) {
  const list = [...tasks];
  switch (mode) {
    case 'due':
      return list.sort((a, b) => {
        const da = a.due ? new Date(a.due).getTime() : Infinity;
        const db = b.due ? new Date(b.due).getTime() : Infinity;
        if (da !== db) return da - db;
        return getEffectiveManualSortOrder(a) - getEffectiveManualSortOrder(b);
      });
    case 'priority':
      return list.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority ?? ''] ?? 3;
        const pb = PRIORITY_ORDER[b.priority ?? ''] ?? 3;
        if (pa !== pb) return pa - pb;
        return getEffectiveManualSortOrder(a) - getEffectiveManualSortOrder(b);
      });
    case 'category':
      return list.sort((a, b) => {
        const ca = a.className || '\uffff';
        const cb = b.className || '\uffff';
        if (ca !== cb) return ca.localeCompare(cb);
        return getEffectiveManualSortOrder(a) - getEffectiveManualSortOrder(b);
      });
    case 'manual':
    default:
      return list.sort(
        (a, b) => getEffectiveManualSortOrder(a) - getEffectiveManualSortOrder(b),
      );
  }
}

export function partitionActiveTasks(tasks, sortMode, categoryFilters) {
  const active = (tasks || []).filter((t) => t.type === 'task' && !t.completed);
  const filtered = filterByCategories(active, categoryFilters);
  const sorted = sortTasksByMode(filtered, sortMode);
  return {
    overdue: sorted.filter(isTaskOverdue),
    regular: sorted.filter((t) => !isTaskOverdue(t)),
    all: sorted,
  };
}

export function getCompletedInWindow(tasks, now = Date.now()) {
  const cutoff = now - COMPLETED_RETENTION_MS;
  return (tasks || [])
    .filter((t) => t.completed && (t.completedAt ?? 0) >= cutoff)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

export function getCompletedExpiringSoon(tasks, now = Date.now()) {
  const warnCutoff = now - COMPLETED_RETENTION_MS + COMPLETED_EXPIRY_WARNING_MS;
  return getCompletedInWindow(tasks, now).filter(
    (t) => (t.completedAt ?? 0) < warnCutoff,
  );
}

/** @deprecated use partitionActiveTasks */
export function sortActiveTasks(tasks) {
  return partitionActiveTasks(tasks, 'manual', []).all;
}

/** @deprecated use getCompletedInWindow */
export function sortCompletedTasks(tasks) {
  return getCompletedInWindow(tasks);
}

export function formatEstimatedMinutes(mins) {
  if (!mins) return null;
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function subtaskProgress(subtasks) {
  const list = subtasks || [];
  if (!list.length) return null;
  const done = list.filter((s) => s.completed).length;
  return { done, total: list.length };
}
