import { requireAuth } from '@/api/requireAuth';

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
  const user = await requireAuth();
  const envelope = readLocal(user.email);
  if (!envelope) return { envelope: null, userEmail: user.email };
  return { envelope, userEmail: user.email };
}

/** Persist encrypted envelope blob (already encrypted on client). */
export async function savePasswordsEnvelope(envelope) {
  const user = await requireAuth();
  const payload = {
    ...envelope,
    updatedAt: Date.now(),
    userEmail: user.email,
  };
  writeLocal(user.email, payload);
  return { envelope: payload, userEmail: user.email };
}

export async function deletePasswordsEnvelope() {
  const user = await requireAuth();
  try {
    localStorage.removeItem(storageKeyForUser(user.email));
  } catch { /* ignore */ }
}
