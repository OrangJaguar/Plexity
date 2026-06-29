import { requireAuth } from '@/api/requireAuth';
import { emptyGoalsDocument, normalizeGoalsDocument } from '@/lib/tools/goals/goals-model';

const STORAGE_KEY = 'veridian.toolsGoals';

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

export async function getOrCreateGoals() {
  const user = await requireAuth();
  const doc = normalizeGoalsDocument(readLocal());
  return { ...doc, userEmail: user.email };
}

export async function saveGoalsDocument(doc) {
  const user = await requireAuth();
  const payload = normalizeGoalsDocument({ ...doc, userEmail: user.email, updatedAt: Date.now() });
  writeLocal(payload);
  return payload;
}

export { emptyGoalsDocument, normalizeGoalsDocument };
