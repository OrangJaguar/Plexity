import { requireAuth } from '@/api/requireAuth';
import { getStorageContext } from '@/api/storage-context';
import { GUEST_KEYS, readGuestJson, writeGuestJson } from '@/lib/storage/guest-store';

const STORAGE_KEY = 'plexity.toolsPasswords';

function storageKeyForUser(email) {
  return `${STORAGE_KEY}.${email}`;
}

function readLocal(email) {
  try {
    const raw = localStorage.getItem(storageKeyForUser(email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(email, data) {
  try {
    localStorage.setItem(storageKeyForUser(email), JSON.stringify(data));
  } catch { /* ignore */ }
}

/** Returns encrypted envelope only — no decrypted secrets. */
export async function getPasswordsEnvelope() {
  const ctx = await getStorageContext();

  if (ctx.mode === 'guest') {
    const envelope = readGuestJson(GUEST_KEYS.passwords, null);
    return { envelope, userEmail: 'guest@local' };
  }

  const user = await requireAuth();
  const envelope = readLocal(user.email);
  if (!envelope) return { envelope: null, userEmail: user.email };
  return { envelope, userEmail: user.email };
}

/** Persist encrypted envelope blob (already encrypted on client). */
export async function savePasswordsEnvelope(envelope) {
  const ctx = await getStorageContext();
  const payload = {
    ...envelope,
    updatedAt: Date.now(),
    userEmail: ctx.mode === 'cloud' ? ctx.userEmail : 'guest@local',
  };

  if (ctx.mode === 'guest') {
    writeGuestJson(GUEST_KEYS.passwords, payload);
    return { envelope: payload, userEmail: 'guest@local' };
  }

  const user = await requireAuth();
  payload.userEmail = user.email;
  writeLocal(user.email, payload);
  return { envelope: payload, userEmail: user.email };
}

export async function deletePasswordsEnvelope() {
  const ctx = await getStorageContext();

  if (ctx.mode === 'guest') {
    try {
      localStorage.removeItem(GUEST_KEYS.passwords);
    } catch { /* ignore */ }
    return;
  }

  const user = await requireAuth();
  try {
    localStorage.removeItem(storageKeyForUser(user.email));
  } catch { /* ignore */ }
}
