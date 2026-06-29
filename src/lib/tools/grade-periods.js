export const PERIOD_SYSTEMS = {
  quarter: {
    id: 'quarter',
    label: 'Quarters',
    periods: [
      { periodId: 'q1', label: 'Q1' },
      { periodId: 'q2', label: 'Q2' },
      { periodId: 'q3', label: 'Q3' },
      { periodId: 'q4', label: 'Q4' },
    ],
  },
  semester: {
    id: 'semester',
    label: 'Semesters',
    periods: [
      { periodId: 's1', label: 'Semester 1' },
      { periodId: 's2', label: 'Semester 2' },
    ],
  },
};

export function getPeriodDefs(system = 'quarter') {
  return PERIOD_SYSTEMS[system]?.periods ?? PERIOD_SYSTEMS.quarter.periods;
}

export function seedPeriods(system = 'quarter') {
  return getPeriodDefs(system).map((p) => ({
    ...p,
    weight: null,
    assignments: [],
  }));
}

export function createEmptyCourse(name, system = 'quarter', sortOrder = 0) {
  return {
    courseId: crypto.randomUUID(),
    name: name.trim(),
    periodSystem: system,
    sortOrder,
    periods: seedPeriods(system),
  };
}

export function emptyGradesDocument(periodSystem = 'quarter') {
  return {
    periodSystem,
    courses: [],
    updatedAt: Date.now(),
  };
}

/** Map LMS section header names to period ids */
export function suggestPeriodId(headerName) {
  const h = (headerName || '').toLowerCase().replace(/\s+/g, '');
  if (/y?q1|quarter1|q1/.test(h)) return 'q1';
  if (/y?q2|quarter2|q2/.test(h)) return 'q2';
  if (/y?q3|quarter3|q3/.test(h)) return 'q3';
  if (/y?q4|quarter4|q4/.test(h)) return 'q4';
  if (/semester1|s1|fall/.test(h)) return 's1';
  if (/semester2|s2|spring/.test(h)) return 's2';
  return null;
}

export function getPeriodLabel(periodId, system = 'quarter') {
  const def = getPeriodDefs(system).find((p) => p.periodId === periodId);
  return def?.label ?? periodId;
}

export function defaultViewPeriodId(system = 'quarter') {
  return system === 'semester' ? 's1' : 'q1';
}

export function ensureCoursePeriods(course, system = 'quarter') {
  const defs = getPeriodDefs(system);
  const byId = Object.fromEntries((course.periods || []).map((p) => [p.periodId, p]));
  return defs.map((def) => ({
    ...def,
    weight: byId[def.periodId]?.weight ?? null,
    assignments: byId[def.periodId]?.assignments ?? [],
  }));
}
