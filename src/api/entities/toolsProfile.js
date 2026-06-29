import { requireAuth } from '@/api/requireAuth';
import { emptyProfileDocument, normalizeProfileDocument } from '@/lib/tools/profile/profile-model';

const STORAGE_KEY = 'veridian.toolsProfile';

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export async function getOrCreateProfile() {
  const user = await requireAuth();
  const doc = normalizeProfileDocument(readLocal());
  return { ...doc, userEmail: user.email };
}

export async function saveProfileDocument(doc) {
  const user = await requireAuth();
  const payload = normalizeProfileDocument({ ...doc, userEmail: user.email, updatedAt: Date.now() });
  writeLocal(payload);
  return payload;
}

export { emptyProfileDocument, normalizeProfileDocument };
