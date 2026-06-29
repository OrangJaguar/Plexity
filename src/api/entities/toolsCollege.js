import { emptyCollegeDocument, normalizeCollegeDocument } from '@/lib/tools/college/college-model';
import { getOrCreateUserDocument, saveUserDocument } from '@/api/entities/toolsUserDocument';

const ENTITY = 'ToolsCollege';
const LEGACY_KEY = 'veridian.toolsCollege';

export { emptyCollegeDocument, normalizeCollegeDocument };

export async function getOrCreateCollege() {
  return getOrCreateUserDocument(ENTITY, {
    empty: emptyCollegeDocument,
    normalize: normalizeCollegeDocument,
    legacyStorageKey: LEGACY_KEY,
  });
}

export async function saveCollegeDocument(doc) {
  return saveUserDocument(ENTITY, doc, {
    normalize: normalizeCollegeDocument,
    legacyStorageKey: LEGACY_KEY,
  });
}

export function newListItem(fields = {}) {
  return { id: crypto.randomUUID(), ...fields };
}
