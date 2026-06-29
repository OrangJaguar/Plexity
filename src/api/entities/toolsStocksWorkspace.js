import { requireAuth } from '@/api/requireAuth';
import { emptyStocksWorkspace, normalizeStocksWorkspace } from '@/lib/tools/stocks/stocks-model';

const STORAGE_KEY = 'veridian.toolsStocksWorkspace';

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

export async function getOrCreateStocksWorkspace() {
  const user = await requireAuth();
  const doc = normalizeStocksWorkspace(readLocal());
  return { ...doc, userEmail: user.email };
}

export async function saveStocksWorkspace(doc) {
  const user = await requireAuth();
  const payload = normalizeStocksWorkspace({ ...doc, userEmail: user.email, updatedAt: Date.now() });
  writeLocal(payload);
  return payload;
}

export { emptyStocksWorkspace, normalizeStocksWorkspace };
