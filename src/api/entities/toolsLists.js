import { requireAuth } from '@/api/requireAuth';
import { emptyListsWorkspace, normalizeListsWorkspace } from '@/lib/tools/lists/lists-model';

const STORAGE_KEY = 'veridian.toolsLists';

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

export async function getOrCreateLists() {
  const user = await requireAuth();
  const doc = normalizeListsWorkspace(readLocal());
  return { ...doc, userEmail: user.email };
}

export async function saveListsDocument(doc) {
  const user = await requireAuth();
  const payload = normalizeListsWorkspace({ ...doc, userEmail: user.email, updatedAt: Date.now() });
  writeLocal(payload);
  return payload;
}

export { emptyListsWorkspace, normalizeListsWorkspace };
