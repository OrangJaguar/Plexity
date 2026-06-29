import { requireAuth } from '@/api/requireAuth';
import { hasToolsEntity, safeCreate, safeFilter, safeUpdate } from '@/api/entities/toolsApi';
import { emptyGradesDocument, seedPeriods } from '@/lib/tools/grade-periods';

const STORAGE_KEY = 'veridian.toolsGrades';

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function mergeGradesDocs(server, local) {
  if (!local) return server;
  if (!server) return local;
  const serverCourses = server.courses || [];
  const localCourses = local.courses || [];
  const periodSystem = local.periodSystem ?? server.periodSystem;
  if (!serverCourses.length && localCourses.length) {
    return {
      ...server,
      courses: localCourses,
      periodSystem,
    };
  }
  if (local.updatedAt && server.updatedAt && local.updatedAt > server.updatedAt) {
    return {
      ...server,
      courses: localCourses.length >= serverCourses.length ? localCourses : serverCourses,
      periodSystem,
    };
  }
  return {
    ...server,
    periodSystem,
  };
}

export async function getOrCreateGrades() {
  const user = await requireAuth();
  const local = readLocal();

  if (!hasToolsEntity('ToolsGrades')) {
    return local ?? { ...emptyGradesDocument(), userEmail: user.email };
  }

  try {
    const rows = await safeFilter('ToolsGrades', { userEmail: user.email });
    if (rows.length > 0) {
      const doc = mergeGradesDocs(rows[0], local);
      writeLocal(doc);
      return doc;
    }
    if (local?.courses?.length) {
      const payload = { ...local, userEmail: user.email, updatedAt: Date.now() };
      try {
        const created = await safeCreate('ToolsGrades', payload);
        writeLocal(created);
        return created;
      } catch {
        writeLocal(payload);
        return payload;
      }
    }
    const now = Date.now();
    const created = await safeCreate('ToolsGrades', {
      userEmail: user.email,
      ...emptyGradesDocument(),
      updatedAt: now,
    });
    writeLocal(created);
    return created;
  } catch {
    return local ?? { ...emptyGradesDocument(), userEmail: user.email };
  }
}

export async function saveGradesDocument(doc) {
  const user = await requireAuth();
  const payload = { ...doc, userEmail: user.email, updatedAt: Date.now() };
  writeLocal(payload);

  if (!hasToolsEntity('ToolsGrades')) {
    return payload;
  }

  try {
    const rows = await safeFilter('ToolsGrades', { userEmail: user.email });
    const existing = rows[0];
    if (!existing?.id) {
      return safeCreate('ToolsGrades', payload);
    }
    return safeUpdate('ToolsGrades', existing.id, payload);
  } catch {
    return payload;
  }
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
