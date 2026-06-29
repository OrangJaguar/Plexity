import { emptyCalculatorWorkspace, normalizeCalculatorWorkspace } from '@/lib/tools/calculator/calculator-model';
import { getOrCreateUserDocument, saveUserDocument } from '@/api/entities/toolsUserDocument';

const ENTITY = 'ToolsCalculator';
const LEGACY_KEY = 'veridian.toolsCalculator';

export async function getOrCreateCalculator() {
  return getOrCreateUserDocument(ENTITY, {
    empty: emptyCalculatorWorkspace,
    normalize: normalizeCalculatorWorkspace,
    legacyStorageKey: LEGACY_KEY,
  });
}

export async function saveCalculatorDocument(doc) {
  return saveUserDocument(ENTITY, doc, {
    normalize: normalizeCalculatorWorkspace,
    legacyStorageKey: LEGACY_KEY,
  });
}

export { emptyCalculatorWorkspace, normalizeCalculatorWorkspace };
