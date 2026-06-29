export function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function generateJourneyId() {
  return generateId('jrn');
}

export function generateModuleId() {
  return generateId('mod');
}

export function generateActivityId() {
  return generateId('act');
}

export function generateCardId() {
  return generateId('crd');
}

export function generateQuestionId() {
  return generateId('q');
}

export function generateConceptId() {
  return generateId('con');
}

export function generateSessionId() {
  return generateId('ses');
}

export function generateSourceId() {
  return generateId('src');
}

export function generateSnapshotId() {
  return generateId('snap');
}

export function generateSurveyResponseId() {
  return generateId('srv');
}
