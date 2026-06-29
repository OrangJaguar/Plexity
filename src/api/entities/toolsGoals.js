import { emptyGoalsDocument, normalizeGoalsDocument } from '@/lib/tools/goals/goals-model';
import { getOrCreateUserDocument, saveUserDocument } from '@/api/entities/toolsUserDocument';

const ENTITY = 'ToolsGoals';
const LEGACY_KEY = 'veridian.toolsGoals';

export async function getOrCreateGoals() {
  return getOrCreateUserDocument(ENTITY, {
    empty: emptyGoalsDocument,
    normalize: normalizeGoalsDocument,
    legacyStorageKey: LEGACY_KEY,
  });
}

export async function saveGoalsDocument(doc) {
  return saveUserDocument(ENTITY, doc, {
    normalize: normalizeGoalsDocument,
    legacyStorageKey: LEGACY_KEY,
  });
}

export { emptyGoalsDocument, normalizeGoalsDocument };
