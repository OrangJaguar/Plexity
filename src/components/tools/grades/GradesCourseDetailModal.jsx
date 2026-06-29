import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import {
  assignmentPercent,
  coursePercent,
  formatPercent,
  formatScore,
  percentToLetter,
  periodPercent,
  periodPoints,
} from '@/lib/tools/grade-calc';
import { letterGradeClass } from '@/lib/tools/grade-colors';
import { getPeriodDefs, seedPeriods } from '@/lib/tools/grade-periods';
import { isPeriodCollapsed, togglePeriodCollapsed } from '@/lib/tools/grades-ui-prefs';

function emptyAssignment() {
  return {
    assignmentId: crypto.randomUUID(),
    title: '',
    pointsEarned: null,
    pointsPossible: 0,
    due: '',
    importedAt: Date.now(),
  };
}

export default function GradesCourseDetailModal({
  open,
  onOpenChange,
  course,
  periodSystem,
  onSaveCourse,
  onImportPeriod,
}) {
  const [localCourse, setLocalCourse] = useState(null);
  const [, bump] = useState(0);

  useEffect(() => {
    if (open && course) {
      setLocalCourse(JSON.parse(JSON.stringify(course)));
    }
  }, [open, course]);

  if (!localCourse) return null;

  const system = localCourse.periodSystem || periodSystem || 'quarter';
  const periods = localCourse.periods?.length ? localCourse.periods : seedPeriods(system);
  const overallPct = coursePercent(periods);
  const overallLetter = percentToLetter(overallPct);

  const setPeriods = (next) => setLocalCourse((c) => ({ ...c, periods: next }));

  const updateAssignment = (periodId, aIdx, patch) => {
    setPeriods(periods.map((p) => {
      if (p.periodId !== periodId) return p;
      const assignments = (p.assignments || []).map((a, i) => (
        i === aIdx ? { ...a, ...patch } : a
      ));
      return { ...p, assignments };
    }));
  };

  const addAssignment = (periodId) => {
    setPeriods(periods.map((p) => (
      p.periodId === periodId
        ? { ...p, assignments: [...(p.assignments || []), emptyAssignment()] }
        : p
    )));
  };

  const removeAssignment = (periodId, aIdx) => {
    setPeriods(periods.map((p) => {
      if (p.periodId !== periodId) return p;
      return { ...p, assignments: (p.assignments || []).filter((_, i) => i !== aIdx) };
    }));
  };

  const handleSystemChange = (nextSystem) => {
    const existing = new Map((localCourse.periods || []).map((p) => [p.periodId, p]));
    const merged = seedPeriods(nextSystem).map((p) => ({
      ...p,
      assignments: existing.get(p.periodId)?.assignments || [],
      weight: existing.get(p.periodId)?.weight ?? null,
    }));
    setLocalCourse((c) => ({ ...c, periodSystem: nextSystem, periods: merged }));
  };

  const handleSave = async () => {
    await onSaveCourse({ ...localCourse, periods });
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title={localCourse.name} maxWidth="680px">
      <div className="tools-grades-detail-head">
        <div className="tools-grades-detail-overall">
          <span className={`tools-grade-letter tools-grade-letter--lg ${letterGradeClass(overallLetter)}`}>
            {overallLetter}
          </span>
          <span className="tools-value-sm">{formatPercent(overallPct)}</span>
        </div>
        <label className="tools-modal-field">
          Period system
          <select
            className="tools-settings-input"
            value={system}
            onChange={(e) => handleSystemChange(e.target.value)}
          >
            <option value="quarter">Quarters</option>
            <option value="semester">Semesters</option>
          </select>
        </label>
      </div>

      {periods.map((period) => {
        const collapsed = isPeriodCollapsed(localCourse.courseId, period.periodId);
        const pct = periodPercent(period.assignments);
        const letter = percentToLetter(pct);
        const pts = periodPoints(period.assignments);
        const label = getPeriodDefs(system).find((d) => d.periodId === period.periodId)?.label || period.periodId;

        return (
          <div key={period.periodId} className="tools-grades-period-block">
            <button
              type="button"
              className="tools-grades-period-header"
              onClick={() => { togglePeriodCollapsed(localCourse.courseId, period.periodId); bump((n) => n + 1); }}
            >
              <span className="tools-grades-period-title">{label}</span>
              <span className="tools-grades-period-meta">
                {formatScore(pts.earned, pts.possible)}
                {' · '}
                {formatPercent(pct)}
                {' '}
                <span className={`tools-grade-letter ${letterGradeClass(letter)}`}>{letter}</span>
              </span>
              {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            {!collapsed && (
              <div className="tools-grades-period-body">
                {(period.assignments || []).map((a, aIdx) => {
                  const aPct = assignmentPercent(a.pointsEarned, a.pointsPossible);
                  const aLetter = percentToLetter(aPct);
                  return (
                    <div key={a.assignmentId || aIdx} className="tools-grades-assignment-row">
                      <input
                        className="tools-settings-input"
                        type="text"
                        value={a.title}
                        onChange={(e) => updateAssignment(period.periodId, aIdx, { title: e.target.value })}
                      />
                      <div className="tools-grades-score-inputs">
                        <input
                          className="tools-settings-input"
                          type="number"
                          placeholder="—"
                          value={a.pointsEarned ?? ''}
                          onChange={(e) => updateAssignment(period.periodId, aIdx, {
                            pointsEarned: e.target.value === '' ? null : Number(e.target.value),
                          })}
                        />
                        <span>/</span>
                        <input
                          className="tools-settings-input"
                          type="number"
                          min="1"
                          value={a.pointsPossible ?? ''}
                          onChange={(e) => updateAssignment(period.periodId, aIdx, {
                            pointsPossible: Number(e.target.value) || 0,
                          })}
                        />
                      </div>
                      <span className="tools-grades-assignment-pct">{formatPercent(aPct)}</span>
                      <span className={`tools-grade-letter ${letterGradeClass(aLetter)}`}>{aLetter}</span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => removeAssignment(period.periodId, aIdx)}
                        aria-label="Remove assignment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
                <div className="tools-grades-period-actions">
                  <button type="button" className="btn btn-sm" onClick={() => addAssignment(period.periodId)}>
                    <Plus size={14} />
                    {' '}
                    Add assignment
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => onImportPeriod?.(localCourse.courseId, period.periodId)}
                  >
                    Import into this period
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="tools-form-actions">
        <span />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </ToolsModal>
  );
}
