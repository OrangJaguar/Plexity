import { emptyStocksWorkspace, normalizeStocksWorkspace } from '@/lib/tools/stocks/stocks-model';
import { getOrCreateUserDocument, saveUserDocument } from '@/api/entities/toolsUserDocument';

const ENTITY = 'ToolsStocksWorkspace';
const LEGACY_KEY = 'veridian.toolsStocksWorkspace';

export async function getOrCreateStocksWorkspace() {
  return getOrCreateUserDocument(ENTITY, {
    empty: emptyStocksWorkspace,
    normalize: normalizeStocksWorkspace,
    legacyStorageKey: LEGACY_KEY,
  });
}

export async function saveStocksWorkspace(doc) {
  return saveUserDocument(ENTITY, doc, {
    normalize: normalizeStocksWorkspace,
    legacyStorageKey: LEGACY_KEY,
  });
}

export { emptyStocksWorkspace, normalizeStocksWorkspace };
