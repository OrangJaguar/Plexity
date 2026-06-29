import { emptyProfileDocument, normalizeProfileDocument } from '@/lib/tools/profile/profile-model';
import { getOrCreateUserDocument, saveUserDocument } from '@/api/entities/toolsUserDocument';

const ENTITY = 'ToolsProfile';
const LEGACY_KEY = 'veridian.toolsProfile';

export async function getOrCreateProfile() {
  return getOrCreateUserDocument(ENTITY, {
    empty: emptyProfileDocument,
    normalize: normalizeProfileDocument,
    legacyStorageKey: LEGACY_KEY,
  });
}

export async function saveProfileDocument(doc) {
  return saveUserDocument(ENTITY, doc, {
    normalize: normalizeProfileDocument,
    legacyStorageKey: LEGACY_KEY,
  });
}

export { emptyProfileDocument, normalizeProfileDocument };
