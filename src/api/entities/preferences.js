import { requireAuth } from '@/api/requireAuth';
import { getSupabase } from '@/api/supabaseClient';
import { fromSqlRow, toSqlRow } from '@/api/entities/supabaseMap';
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

async function listPreferencesRows() {
  const user = await requireAuth();
  const { data, error } = await getSupabase()
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id);
  if (error) throw error;
  return (data ?? []).map((row) => fromSqlRow(row));
}

async function createPreferencesRow(payload) {
  const user = await requireAuth();
  const row = {
    ...toSqlRow(payload, { stripId: true }),
    user_id: user.id,
    user_email: payload.userEmail ?? user.email,
  };
  const { data, error } = await getSupabase()
    .from('user_preferences')
    .insert(row)
    .select('*')
    .single();
  if (error) throw error;
  return fromSqlRow(data);
}

async function updatePreferencesRow(id, patch) {
  const user = await requireAuth();
  const sqlPatch = toSqlRow(patch, { stripId: true });
  delete sqlPatch.user_id;
  if (patch.userEmail != null) sqlPatch.user_email = patch.userEmail;
  const { data, error } = await getSupabase()
    .from('user_preferences')
    .update(sqlPatch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  if (error) throw error;
  return fromSqlRow(data);
}

export async function getPreferences() {
  await requireAuth();
  const rows = await listPreferencesRows();
  return pickBestPreferencesRow(rows);
}

export async function updatePreferences(patch) {
  const user = await requireAuth();
  const rows = await listPreferencesRows();
  if (rows.length > 0) {
    return updatePreferencesRow(rows[0].id, patch);
  }
  return createPreferencesRow({
    ...patch,
    userEmail: user.email,
    pinnedToolIds: patch.pinnedToolIds ?? ['dashboard', 'tasks', 'calendar', 'focus', 'journal'],
    createdAt: patch.createdAt ?? Date.now(),
  });
}

export async function checkUsernameAvailable(username, { excludeEmail } = {}) {
  const normalized = normalizeUsername(username);
  if (!isValidUsernameFormat(normalized)) {
    return { available: false, reason: 'invalid_format' };
  }

  try {
    const { data, error } = await getSupabase().rpc('is_username_available', {
      desired: normalized,
    });
    if (error) throw error;
    if (data === true) return { available: true, reason: null };
    if (excludeEmail) {
      const { data: mine } = await getSupabase()
        .from('user_preferences')
        .select('username, user_email')
        .eq('user_email', excludeEmail)
        .maybeSingle();
      if (mine && String(mine.username || '').toLowerCase() === normalized) {
        return { available: true, reason: null };
      }
    }
    return { available: false, reason: 'taken' };
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
  const rows = await listPreferencesRows();
  const now = Date.now();
  const payload = {
    displayName,
    userEmail: email,
    createdAt: now,
    lastActiveAt: now,
    pinnedToolIds: getDefaultPinnedToolIds(),
  };

  if (rows.length > 0) {
    return updatePreferencesRow(rows[0].id, payload);
  }
  return createPreferencesRow(payload);
}

export async function touchLastActive() {
  await requireAuth();
  const rows = await listPreferencesRows();
  const now = Date.now();
  const pref = pickBestPreferencesRow(rows);
  if (pref) {
    return updatePreferencesRow(pref.id, { lastActiveAt: now });
  }
  return null;
}
