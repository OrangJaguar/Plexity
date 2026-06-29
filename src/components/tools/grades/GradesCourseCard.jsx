import { formatPercent, percentToLetter, periodPercent } from '@/lib/tools/grade-calc';
import { letterGradeClass } from '@/lib/tools/grade-colors';
import { ensureCoursePeriods, getPeriodLabel } from '@/lib/tools/grade-periods';

export default function GradesCourseCard({ course, periodSystem, viewPeriodId, onClick }) {
  const periods = ensureCoursePeriods(course, periodSystem);
  const activePeriod = periods.find((p) => p.periodId === viewPeriodId);
  const pct = periodPercent(activePeriod?.assignments || []);
  const letter = pct != null ? percentToLetter(pct) : '—';
  const assignmentCount = activePeriod?.assignments?.length || 0;

  return (
    <button type="button" className="tools-grade-course-card" onClick={onClick}>
      <span className={`tools-grade-letter tools-grade-letter--card ${letterGradeClass(letter)}`}>
        {letter}
      </span>
      <span className="tools-grade-course-card-body">
        <span className="tools-grade-course-name">{course.name}</span>
        <span className="tools-grade-course-meta">
          {getPeriodLabel(viewPeriodId, periodSystem)}
          {' · '}
          {assignmentCount}
          {' assignment'}
          {assignmentCount === 1 ? '' : 's'}
        </span>
      </span>
      <span className="tools-grade-course-pct">{pct != null ? formatPercent(pct) : '—'}</span>
    </button>
  );
}
