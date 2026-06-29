import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import GradesCourseCard from '@/components/tools/grades/GradesCourseCard';
import GradesManageClassesModal from '@/components/tools/grades/GradesManageClassesModal';
import GradesImportModal from '@/components/tools/grades/GradesImportModal';
import GradesImportConfirmModal from '@/components/tools/grades/GradesImportConfirmModal';
import GradesCourseDetailModal from '@/components/tools/grades/GradesCourseDetailModal';
import { createEmptyCourse, defaultViewPeriodId, getPeriodDefs } from '@/lib/tools/grade-periods';
import { readGradesUiPrefs, writeGradesUiPrefs } from '@/lib/tools/grades-ui-prefs';

export default function GradesContent({
  courses,
  periodSystem,
  categorySuggestions = [],
  saveCourses,
  saveDocument,
  upsertPeriodAssignments,
  updateCourse,
}) {
  const prefs = readGradesUiPrefs();
  const [periodSystemUi, setPeriodSystemUi] = useState(
    () => prefs.periodSystem || periodSystem || 'quarter',
  );
  const [viewPeriodId, setViewPeriodId] = useState(
    () => prefs.viewPeriodId || defaultViewPeriodId(prefs.periodSystem || periodSystem),
  );
  const [manageOpen, setManageOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailCourseId, setDetailCourseId] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [prefillImport, setPrefillImport] = useState({});

  const periodOptions = useMemo(
    () => getPeriodDefs(periodSystemUi),
    [periodSystemUi],
  );

  useEffect(() => {
    const validIds = getPeriodDefs(periodSystemUi).map((p) => p.periodId);
    setViewPeriodId((current) => {
      if (validIds.includes(current)) return current;
      const next = defaultViewPeriodId(periodSystemUi);
      writeGradesUiPrefs({ viewPeriodId: next });
      return next;
    });
  }, [periodSystemUi]);

  const sortedCourses = useMemo(
    () => [...courses].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [courses],
  );

  const detailCourse = sortedCourses.find((c) => c.courseId === detailCourseId);

  const handleViewPeriodChange = (periodId) => {
    setViewPeriodId(periodId);
    writeGradesUiPrefs({ viewPeriodId: periodId });
  };

  const handlePeriodSystemChange = (system) => {
    if (system === periodSystemUi) return;
    const nextView = defaultViewPeriodId(system);
    setPeriodSystemUi(system);
    setViewPeriodId(nextView);
    writeGradesUiPrefs({ periodSystem: system, viewPeriodId: nextView });
    void saveDocument({ periodSystem: system }).catch(() => {
      toast.error('Could not save grading period preference.');
    });
  };

  const handleSaveCourses = async (nextCourses) => {
    try {
      await saveCourses(nextCourses);
      toast.success('Classes saved.');
    } catch {
      toast.error('Could not save classes.');
    }
  };

  const handleParsed = (payload) => {
    setPendingImport(payload);
    setConfirmOpen(true);
  };

  const handleConfirmImport = async (assignments) => {
    if (!pendingImport) return;
    let courseId = pendingImport.courseId;
    const { periodId, newClassName, detectedWeight } = pendingImport;

    try {
      let workingCourses = [...courses];

      if (newClassName) {
        const created = createEmptyCourse(newClassName, periodSystemUi, workingCourses.length);
        workingCourses = [...workingCourses, created];
        await saveCourses(workingCourses);
        courseId = created.courseId;
      }

      if (detectedWeight != null) {
        const course = workingCourses.find((c) => c.courseId === courseId);
        if (course) {
          const periods = (course.periods || []).map((p) => (
            p.periodId === periodId ? { ...p, weight: detectedWeight } : p
          ));
          await updateCourse({ courseId, patch: { periods } });
        }
      }

      writeGradesUiPrefs({ viewPeriodId: periodId, lastImport: { courseId, periodId } });
      setViewPeriodId(periodId);
      await upsertPeriodAssignments({ courseId, periodId, assignments });
      toast.success('Grades imported.');
      setPendingImport(null);
    } catch {
      toast.error('Could not save — try again or deploy ToolsGrades in Base44.');
    }
  };

  const openImportForPeriod = (courseId, periodId) => {
    setDetailCourseId(null);
    setPrefillImport({ courseId, periodId });
    setImportOpen(true);
  };

  return (
    <div className="tools-grades-shell">
      <div className="tools-grades-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => { setPrefillImport({}); setImportOpen(true); }}>
          Import grades
        </button>
        <button type="button" className="btn" onClick={() => setManageOpen(true)}>
          Adjust classes
        </button>
        <div className="tools-grades-view-period" role="group" aria-label="Viewing period">
          {periodOptions.map((p) => (
            <button
              key={p.periodId}
              type="button"
              className={viewPeriodId === p.periodId ? 'active' : ''}
              onClick={() => handleViewPeriodChange(p.periodId)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="tools-grades-period-toggle" role="group" aria-label="Grading period system">
          <button
            type="button"
            className={periodSystemUi === 'quarter' ? 'active' : ''}
            onClick={() => handlePeriodSystemChange('quarter')}
          >
            Quarters
          </button>
          <button
            type="button"
            className={periodSystemUi === 'semester' ? 'active' : ''}
            onClick={() => handlePeriodSystemChange('semester')}
          >
            Semesters
          </button>
        </div>
      </div>

      {!sortedCourses.length ? (
        <div className="tools-empty-hint">
          No classes yet. Use Adjust classes or Import to get started.
        </div>
      ) : (
        <div className="tools-grades-course-list">
          {sortedCourses.map((course) => (
            <GradesCourseCard
              key={course.courseId}
              course={course}
              periodSystem={periodSystemUi}
              viewPeriodId={viewPeriodId}
              onClick={() => setDetailCourseId(course.courseId)}
            />
          ))}
        </div>
      )}

      <GradesManageClassesModal
        open={manageOpen}
        onOpenChange={setManageOpen}
        courses={sortedCourses}
        periodSystem={periodSystemUi}
        categorySuggestions={categorySuggestions}
        onSave={handleSaveCourses}
      />

      <GradesImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        courses={sortedCourses}
        periodSystem={periodSystemUi}
        onParsed={handleParsed}
        prefillCourseId={prefillImport.courseId}
        prefillPeriodId={prefillImport.periodId}
      />

      <GradesImportConfirmModal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        assignments={pendingImport?.assignments || []}
        hint={pendingImport?.hint}
        totalPoints={pendingImport?.totalPoints}
        onSubmit={handleConfirmImport}
      />

      {detailCourse && (
        <GradesCourseDetailModal
          open={Boolean(detailCourseId)}
          onOpenChange={(open) => { if (!open) setDetailCourseId(null); }}
          course={detailCourse}
          periodSystem={periodSystemUi}
          onSaveCourse={(updated) => updateCourse({ courseId: updated.courseId, patch: updated })}
          onImportPeriod={openImportForPeriod}
        />
      )}
    </div>
  );
}
