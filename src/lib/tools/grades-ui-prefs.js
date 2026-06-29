const STORAGE_KEY = 'plexity.gradesUi';

const DEFAULTS = {
  periodSystem: 'quarter',
  viewPeriodId: 'q1',
  lastImport: { courseId: '', periodId: 'q1' },
  collapsedPeriods: {},
};

export function readGradesUiPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeGradesUiPrefs(patch) {
  const next = { ...readGradesUiPrefs(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}

export function togglePeriodCollapsed(courseId, periodId) {
  const prefs = readGradesUiPrefs();
  const key = `${courseId}:${periodId}`;
  const collapsed = { ...(prefs.collapsedPeriods || {}) };
  collapsed[key] = !collapsed[key];
  return writeGradesUiPrefs({ collapsedPeriods: collapsed });
}

export function isPeriodCollapsed(courseId, periodId) {
  const prefs = readGradesUiPrefs();
  return Boolean(prefs.collapsedPeriods?.[`${courseId}:${periodId}`]);
}
