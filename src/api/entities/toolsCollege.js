import { requireAuth } from '@/api/requireAuth';
import { emptyCollegeDocument, normalizeCollegeDocument } from '@/lib/tools/college/college-model';

const STORAGE_KEY = 'veridian.toolsCollege';

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

export { emptyCollegeDocument, normalizeCollegeDocument };

export async function getOrCreateCollege() {
  const user = await requireAuth();
  const local = readLocal();
  const doc = normalizeCollegeDocument(local);
  return { ...doc, userEmail: user.email };
}

export async function saveCollegeDocument(doc) {
  const user = await requireAuth();
  const payload = normalizeCollegeDocument({ ...doc, userEmail: user.email, updatedAt: Date.now() });
  writeLocal(payload);
  return payload;
}

export function newListItem(fields = {}) {
  return { id: crypto.randomUUID(), ...fields };
}
