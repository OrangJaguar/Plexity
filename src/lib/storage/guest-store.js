import {
  GUEST_ENTITY_KEYS,
  GUEST_PREFIX,
  STORAGE_KEYS,
} from '@/lib/storage/storage-keys';

export const GUEST_KEYS = STORAGE_KEYS.guest;
export { GUEST_ENTITY_KEYS };
export const LOCAL_ONLY_NOTICE_KEY = STORAGE_KEYS.localOnlyNotice;

export function readGuestJson(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeGuestJson(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore quota errors */ }
}

export function clearGuestStorage() {
  if (typeof window === 'undefined') return;
  try {
    const keys = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const k = window.localStorage.key(i);
      if (k?.startsWith(GUEST_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => window.localStorage.removeItem(k));
  } catch { /* ignore */ }
}

export function readGuestArray(key) {
  const rows = readGuestJson(key, []);
  return Array.isArray(rows) ? rows : [];
}

export function writeGuestArray(key, rows) {
  writeGuestJson(key, rows);
}

export function guestFindBy(rows, field, value) {
  return rows.find((row) => row[field] === value) ?? null;
}

export function guestUpsertBy(rows, field, value, row) {
  const idx = rows.findIndex((r) => r[field] === value);
  if (idx >= 0) {
    const next = [...rows];
    next[idx] = { ...next[idx], ...row };
    return next;
  }
  return [...rows, row];
}

export function guestDeleteBy(rows, field, value) {
  return rows.filter((r) => r[field] !== value);
}
