import { requireAuth } from '@/api/requireAuth';
import { emptyCalculatorWorkspace, normalizeCalculatorWorkspace } from '@/lib/tools/calculator/calculator-model';

const STORAGE_KEY = 'veridian.toolsCalculator';

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

export async function getOrCreateCalculator() {
  const user = await requireAuth();
  const doc = normalizeCalculatorWorkspace(readLocal());
  return { ...doc, userEmail: user.email };
}

export async function saveCalculatorDocument(doc) {
  const user = await requireAuth();
  const payload = normalizeCalculatorWorkspace({ ...doc, userEmail: user.email, updatedAt: Date.now() });
  writeLocal(payload);
  return payload;
}

export { emptyCalculatorWorkspace, normalizeCalculatorWorkspace };
