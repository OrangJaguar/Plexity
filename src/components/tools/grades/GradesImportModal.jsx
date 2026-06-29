import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import { parseLmsGradePaste } from '@/lib/tools/grade-parse';
import { getPeriodDefs } from '@/lib/tools/grade-periods';
import { readGradesUiPrefs, writeGradesUiPrefs } from '@/lib/tools/grades-ui-prefs';

export default function GradesImportModal({
  open,
  onOpenChange,
  courses,
  periodSystem,
  onParsed,
  prefillCourseId,
  prefillPeriodId,
}) {
  const prefs = readGradesUiPrefs();
  const [courseId, setCourseId] = useState(prefillCourseId || prefs.lastImport?.courseId || '');
  const [periodId, setPeriodId] = useState(prefillPeriodId || prefs.lastImport?.periodId || 'q1');
  const [raw, setRaw] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCourseId(prefillCourseId || prefs.lastImport?.courseId || courses[0]?.courseId || '');
    setPeriodId(prefillPeriodId || prefs.lastImport?.periodId || 'q1');
  }, [open, prefillCourseId, prefillPeriodId, courses, prefs.lastImport]);

  const periods = getPeriodDefs(periodSystem);
  const selectedCourse = courses.find((c) => c.courseId === courseId);

  const handleParse = () => {
    const result = parseLmsGradePaste(raw, {
      courseName: selectedCourse?.name,
      periodId,
    });
    if (!result.assignments.length) {
      toast.error('No assignments found. Check your paste and try again.');
      return;
    }
    writeGradesUiPrefs({
      lastImport: { courseId, periodId },
    });
    onParsed({
      ...result,
      courseId,
      periodId,
      newClassName: creatingNew ? newClassName.trim() : '',
    });
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title="Import grades" maxWidth="560px">
      <div className="tools-modal-field">
        <label htmlFor="grades-import-class">Class</label>
        <select
          id="grades-import-class"
          className="tools-settings-input"
          value={creatingNew ? '__new__' : courseId}
          onChange={(e) => {
            if (e.target.value === '__new__') {
              setCreatingNew(true);
            } else {
              setCreatingNew(false);
              setCourseId(e.target.value);
            }
          }}
        >
          {courses.map((c) => (
            <option key={c.courseId} value={c.courseId}>{c.name}</option>
          ))}
          <option value="__new__">Create new class…</option>
        </select>
      </div>
      {creatingNew && (
        <div className="tools-modal-field">
          <label htmlFor="grades-new-class">New class name</label>
          <input
            id="grades-new-class"
            className="tools-settings-input"
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="e.g. XPD"
          />
        </div>
      )}
      <div className="tools-modal-field">
        <label htmlFor="grades-import-period">Grading period</label>
        <select
          id="grades-import-period"
          className="tools-settings-input"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.periodId} value={p.periodId}>{p.label}</option>
          ))}
        </select>
      </div>
      <div className="tools-modal-field">
        <label htmlFor="grades-import-raw">Paste grade export</label>
        <textarea
          id="grades-import-raw"
          className="tools-settings-input tools-grades-import-textarea"
          rows={10}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Paste the raw text from your school gradebook…"
        />
      </div>
      <div className="tools-form-actions">
        <span />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleParse} disabled={!raw.trim()}>
            Parse
          </button>
        </div>
      </div>
    </ToolsModal>
  );
}
