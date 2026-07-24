import { TOOL_REGISTRY } from '@/lib/tools/registry';
import { STORAGE_KEYS, migrateLegacyPinnedToolIdsKey } from '@/lib/storage/storage-keys';

export const PINNED_TOOLS_STORAGE_KEY = STORAGE_KEYS.pinnedToolIds;

const VALID_IDS = new Set(TOOL_REGISTRY.map((t) => t.id));

/** Default pinned subset: dashboard, tasks, calendar, focus, journal — in that order */
export function getDefaultPinnedToolIds() {
  const DEFAULT_ORDER = ['dashboard', 'tasks', 'calendar', 'focus', 'journal'];
  return DEFAULT_ORDER.filter((id) => VALID_IDS.has(id));
}

/** @param {unknown} raw @returns {string[]|null} null when input is not an array */
export function sanitizePinnedToolIds(raw) {
  if (!Array.isArray(raw)) return null;
  return raw.filter((id) => typeof id === 'string' && VALID_IDS.has(id));
}

/** @returns {string[]|null} null if never stored */
export function readPinnedToolIdsFromStorage() {
  migrateLegacyPinnedToolIdsKey();
  try {
    const raw = localStorage.getItem(PINNED_TOOLS_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return sanitizePinnedToolIds(parsed) ?? [];
  } catch {
    return null;
  }
}

/** @param {string[]} ids */
export function writePinnedToolIdsToStorage(ids) {
  try {
    localStorage.setItem(PINNED_TOOLS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore quota errors */
  }
}

/** Resolve ids for initial hydrate: storage → prefs → defaults */
export function resolvePinnedToolIds(source = {}) {
  const stored = readPinnedToolIdsFromStorage();
  if (stored !== null) return stored;

  const fromPrefs = sanitizePinnedToolIds(source.preferences?.pinnedToolIds);
  if (fromPrefs !== null) return fromPrefs;

  return getDefaultPinnedToolIds();
}

/** @param {string} toolId */
export function isToolPinned(toolId, pinnedToolIds) {
  return pinnedToolIds.includes(toolId);
}

/** @param {string} toolId @param {string[]} pinnedToolIds */
export function togglePinnedToolId(toolId, pinnedToolIds) {
  if (!VALID_IDS.has(toolId)) return pinnedToolIds;
  if (pinnedToolIds.includes(toolId)) {
    return pinnedToolIds.filter((id) => id !== toolId);
  }
  return [...pinnedToolIds, toolId];
}

/**
 * Move item at fromIndex to insertion gap (0 = before first, n = after last).
 * @param {string[]} ids
 * @param {number} fromIndex
 * @param {number} gapIndex 0..ids.length inclusive
 */
export function movePinnedToolToGap(ids, fromIndex, gapIndex) {
  if (!ids.length || fromIndex < 0 || fromIndex >= ids.length) return ids;

  const clampedGap = Math.max(0, Math.min(gapIndex, ids.length));
  const next = [...ids];
  const [item] = next.splice(fromIndex, 1);

  let insertAt = clampedGap;
  if (clampedGap > fromIndex) insertAt = clampedGap - 1;
  insertAt = Math.max(0, Math.min(insertAt, next.length));
  next.splice(insertAt, 0, item);
  return next;
}

/** @deprecated use movePinnedToolToGap */
export function reorderPinnedToolIds(ids, fromIndex, toIndex) {
  if (fromIndex === toIndex) return ids;
  return movePinnedToolToGap(ids, fromIndex, toIndex > fromIndex ? toIndex + 1 : toIndex);
}