import { base44 } from '@/api/base44Client';
import { requireAuth } from '@/api/requireAuth';
import { normalizeUsername, isValidUsernameFormat } from '@/utils/schemas/preferences';
import { getDefaultPinnedToolIds } from '@/lib/tools/pinned-tools';

function pickBestPreferencesRow(rows) {
  if (!rows?.length) return null;
  if (rows.length === 1) return rows[0];
  return rows.reduce((best, row) => {
    if (row.onboardingCompletedAt && !best.onboardingCompletedAt) return row;
    if (row.onboardingCompletedAt && best.onboardingCompletedAt) {
      return (row.lastActiveAt ?? 0) > (best.lastActiveAt ?? 0) ? row : best;
    }
    return (row.createdAt ?? 0) > (best.createdAt ?? 0) ? row : best;
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
    hintsShown: patch.hintsShown ?? [],
    pinnedToolIds: patch.pinnedToolIds ?? getDefaultPinnedToolIds(),
    notificationPref: patch.notificationPref ?? 'off',
    defaultPrivacy: patch.defaultPrivacy ?? 'private',
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

export async function createUserPreferencesOnSignup({ username, userEmail }) {
  const normalized = normalizeUsername(username);
  if (!isValidUsernameFormat(normalized)) {
    throw new Error('Please choose a valid username.');
  }

  const availability = await checkUsernameAvailable(normalized, { excludeEmail: userEmail });
  if (!availability.available) {
    throw new Error('That username is already taken. Try another.');
  }

  const rows = await base44.entities.UserPreferences.list();
  const now = Date.now();
  const payload = {
    username: normalized,
    userEmail,
    createdAt: now,
    lastActiveAt: now,
    hintsShown: [],
    notificationPref: 'off',
    defaultPrivacy: 'private',
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
