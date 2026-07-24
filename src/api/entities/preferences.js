import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';
import { normalizeUsername, isValidUsernameFormat } from '@/utils/schemas/preferences';
import { getDefaultPinnedToolIds } from '@/lib/tools/pinned-tools';

function pickBestPreferencesRow(rows) {
  if (!rows?.length) return null;
  if (rows.length === 1) return rows[0];
  return rows.reduce((best, row) => {
    const rowActive = row.lastActiveAt ?? row.createdAt ?? 0;
    const bestActive = best.lastActiveAt ?? best.createdAt ?? 0;
    return rowActive > bestActive ? row : best;
  });
}

export async function getPreferences() {
  await requireAuth();
  const rows = await base44.entities.UserPreferences.list();
  return pickBestPreferencesRow(rows);
}

export async function updatePreferences(patch) {
  const user = await requireAuth();
  const rows = await base44.entities.UserPreferences.list();
  if (rows.length > 0) {
    return base44.entities.UserPreferences.update(rows[0].id, patch);
  }
  return base44.entities.UserPreferences.create({
    ...patch,
    userEmail: user.email,
    pinnedToolIds: patch.pinnedToolIds ?? ['dashboard', 'tasks', 'calendar', 'focus', 'journal'],
    createdAt: patch.createdAt ?? Date.now(),
  });
}

/**
 * Best-effort username availability check. RLS may limit cross-user reads on Base44;
 * format validation is always enforced client-side before signup.
 */
export async function checkUsernameAvailable(username, { excludeEmail } = {}) {
  const normalized = normalizeUsername(username);
  if (!isValidUsernameFormat(normalized)) {
    return { available: false, reason: 'invalid_format' };
  }

  try {
    const rows = await base44.entities.UserPreferences.filter({ username: normalized });
    const taken = rows.some((row) => row.username === normalized && row.userEmail !== excludeEmail);
    return { available: !taken, reason: taken ? 'taken' : null };
  } catch {
    return { available: true, reason: null };
  }
}

export async function createUserPreferencesOnSignup({ userEmail }) {
  const email = String(userEmail || '').trim();
  if (!email) {
    throw new Error('Missing account email.');
  }

  const displayName = email.split('@')[0]?.trim() || 'User';
  const rows = await base44.entities.UserPreferences.list();
  const now = Date.now();
  const payload = {
    displayName,
    userEmail: email,
    createdAt: now,
    lastActiveAt: now,
    pinnedToolIds: getDefaultPinnedToolIds(),
  };

  if (rows.length > 0) {
    return base44.entities.UserPreferences.update(rows[0].id, payload);
  }
  return base44.entities.UserPreferences.create(payload);
}

export async function touchLastActive() {
  await requireAuth();
  const rows = await base44.entities.UserPreferences.list();
  const now = Date.now();
  const pref = pickBestPreferencesRow(rows);
  if (pref) {
    return base44.entities.UserPreferences.update(pref.id, { lastActiveAt: now });
  }
  return null;
}
