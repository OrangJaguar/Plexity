import { requireAuth } from '@/api/requireAuth';
import { hasToolsEntity, safeCreate, safeFilter, safeUpdate } from '@/api/entities/toolsApi';
import { emptyGradesDocument, seedPeriods } from '@/lib/tools/grade-periods';

const LEGACY_KEY = 'veridian.toolsGrades';
const MIGRATED_KEY = 'veridian.migrated.ToolsGrades';

function readLegacy() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearLegacy() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LEGACY_KEY);
    window.localStorage.setItem(MIGRATED_KEY, '1');
  } catch { /* ignore */ }
}

function mergeGradesDocs(server, local) {
  if (!local) return server;
  if (!server) return local;
  const serverCourses = server.courses || [];
  const localCourses = local.courses || [];
  const periodSystem = local.periodSystem ?? server.periodSystem;
  if (!serverCourses.length && localCourses.length) {
    return { ...server, courses: localCourses, periodSystem };
  }
  if (local.updatedAt && server.updatedAt && local.updatedAt > server.updatedAt) {
    return {
      ...server,
      courses: localCourses.length >= serverCourses.length ? localCourses : serverCourses,
      periodSystem,
    };
  }
  return { ...server, periodSystem };
}

export async function getOrCreateGrades() {
  const user = await requireAuth();
  const legacy = readLegacy();
  const migrated = typeof window !== 'undefined' && window.localStorage.getItem(MIGRATED_KEY) === '1';

  if (!hasToolsEntity('ToolsGrades')) {
    return legacy ?? { ...emptyGradesDocument(), userEmail: user.email };
  }

  try {
    const rows = await safeFilter('ToolsGrades', { userEmail: user.email });
    if (rows.length > 0) {
      let doc = mergeGradesDocs(rows[0], legacy && !migrated ? legacy : null);
      if (legacy && !migrated && (legacy.updatedAt ?? 0) > (rows[0].updatedAt ?? 0)) {
        doc = await saveGradesDocument(doc);
        clearLegacy();
        return doc;
      }
      if (legacy && !migrated) clearLegacy();
      return doc;
    }

    if (legacy?.courses?.length) {
      const saved = await saveGradesDocument({ ...legacy, userEmail: user.email });
      clearLegacy();
      return saved;
    }

    const now = Date.now();
    const created = await safeCreate('ToolsGrades', {
      userEmail: user.email,
      ...emptyGradesDocument(),
      updatedAt: now,
    });
    return created;
  } catch {
    return legacy ?? { ...emptyGradesDocument(), userEmail: user.email };
  }
}

export async function saveGradesDocument(doc) {
  const user = await requireAuth();
  const payload = { ...doc, userEmail: user.email, updatedAt: Date.now() };

  if (!hasToolsEntity('ToolsGrades')) {
    return payload;
  }

  const rows = await safeFilter('ToolsGrades', { userEmail: user.email });
  const existing = rows[0];
  if (!existing?.id) {
    const created = await safeCreate('ToolsGrades', payload);
    clearLegacy();
    return created;
  }
  const updated = await safeUpdate('ToolsGrades', existing.id, payload);
  clearLegacy();
  return updated;
}

export async function updateGrades(patch) {
  const current = await getOrCreateGrades();
  return saveGradesDocument({ ...current, ...patch });
}

export async function saveCourses(courses, cachedDoc) {
  const current = cachedDoc ?? await getOrCreateGrades();
  return saveGradesDocument({ ...current, courses });
}

export async function upsertPeriodAssignments(courseId, periodId, assignments, cachedDoc) {
  const current = cachedDoc ?? await getOrCreateGrades();
  const courses = (current.courses || []).map((course) => {
    if (course.courseId !== courseId) return course;
    const periods = ensurePeriodExists(course.periods, periodId, current.periodSystem);
    const nextPeriods = periods.map((period) => (
      period.periodId === periodId ? { ...period, assignments } : period
    ));
    return { ...course, periods: nextPeriods };
  });
  return saveGradesDocument({ ...current, courses });
}

function ensurePeriodExists(periods, periodId, system) {
  const list = periods?.length ? [...periods] : seedPeriods(system);
  if (list.some((p) => p.periodId === periodId)) return list;
  return [...list, { periodId, label: periodId, weight: null, assignments: [] }];
}

export async function updateCourse(courseId, patch, cachedDoc) {
  const current = cachedDoc ?? await getOrCreateGrades();
  const courses = (current.courses || []).map((c) => (
    c.courseId === courseId ? { ...c, ...patch } : c
  ));
  return saveGradesDocument({ ...current, courses });
}
