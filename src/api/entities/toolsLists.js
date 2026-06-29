import { emptyListsWorkspace, normalizeListsWorkspace } from '@/lib/tools/lists/lists-model';
import { getOrCreateUserDocument, saveUserDocument } from '@/api/entities/toolsUserDocument';

const ENTITY = 'ToolsLists';
const LEGACY_KEY = 'veridian.toolsLists';

export async function getOrCreateLists() {
  return getOrCreateUserDocument(ENTITY, {
    empty: emptyListsWorkspace,
    normalize: normalizeListsWorkspace,
    legacyStorageKey: LEGACY_KEY,
  });
}

export async function saveListsDocument(doc) {
  return saveUserDocument(ENTITY, doc, {
    normalize: normalizeListsWorkspace,
    legacyStorageKey: LEGACY_KEY,
  });
}

export { emptyListsWorkspace, normalizeListsWorkspace };
