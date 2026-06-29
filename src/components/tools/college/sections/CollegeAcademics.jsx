import { Plus, Trash2 } from 'lucide-react';
import {
  CollegeCard, CollegeField, CollegeGrid, CollegeInput, CollegePageHeader,
  CollegeSelect, CollegeTextarea,
} from '@/components/tools/college/college-shared';
import { AP_COURSES, AP_SCORES, IB_COURSES, IB_SCORES, SCORE_LABELS } from '@/lib/tools/college/college-ap-ib';
import { COLLEGE_MAJORS } from '@/lib/tools/college/college-majors';
import { resizeCourseEntries } from '@/lib/tools/college/college-model';

function CourseScoreGrid({ entries, courses, scores, onChange }) {
  if (!entries.length) return null;

  return (
    <div className="college-course-score-grid">
      {entries.map((entry, i) => (
        <div key={entry.id} className="college-course-score-card">
          <span className="college-course-score-index">{i + 1}</span>
          <CollegeSelect
            value={entry.course}
            onChange={(e) => {
              const next = [...entries];
              next[i] = { ...entry, course: e.target.value };
              onChange(next);
            }}
          >
            <option value="">Select course…</option>
            {courses.map((c) => <option key={c} value={c}>{c}</option>)}
          </CollegeSelect>
          <CollegeSelect
            value={entry.score}
            onChange={(e) => {
              const next = [...entries];
              next[i] = { ...entry, score: e.target.value };
              onChange(next);
            }}
          >
            <option value="">Score…</option>
            {scores.map((s) => (
              <option key={s} value={s}>{SCORE_LABELS[s] || s}</option>
            ))}
          </CollegeSelect>
        </div>
      ))}
    </div>
  );
}

export default function CollegeAcademics({ doc, updateDoc }) {
  const a = doc.academics || {};
  const majors = a.intendedMajorList?.length ? a.intendedMajorList : [''];

  const patch = (partial) => {
    updateDoc({ academics: { ...a, ...partial } });
  };

  const setApCount = (value) => {
    const apCourses = resizeCourseEntries(value, a.apCourses || []);
    patch({ apCount: value, apCourses });
  };

  const setIbCount = (value) => {
    const ibCourses = resizeCourseEntries(value, a.ibCourses || []);
    patch({ ibCount: value, ibCourses });
  };

  const updateMajor = (index, value) => {
    const next = [...majors];
    next[index] = value;
    patch({ intendedMajorList: next, intendedMajors: next.filter(Boolean).join(', ') });
  };

  const addMajor = () => {
    if (majors.length >= 5) return;
    patch({ intendedMajorList: [...majors, ''] });
  };

  const removeMajor = (index) => {
    const next = majors.filter((_, i) => i !== index);
    patch({ intendedMajorList: next.length ? next : [''], intendedMajors: next.filter(Boolean).join(', ') });
  };

  return (
    <div className="college-section">
      <CollegePageHeader
        title="Academics"
        description="Structured academic summary for applications — not a transcript vault."
      />

      <CollegeCard title="Academic profile">
        <CollegeGrid>
          <CollegeField label="High school name">
            <CollegeInput value={a.schoolName} onChange={(e) => patch({ schoolName: e.target.value })} />
          </CollegeField>
          <CollegeField label="Graduation year">
            <CollegeInput value={a.gradYear} onChange={(e) => patch({ gradYear: e.target.value })} placeholder="2026" />
          </CollegeField>
          <CollegeField label="GPA (unweighted)">
            <CollegeInput value={a.gpaUnweighted} onChange={(e) => patch({ gpaUnweighted: e.target.value })} />
          </CollegeField>
          <CollegeField label="GPA (weighted)">
            <CollegeInput value={a.gpaWeighted} onChange={(e) => patch({ gpaWeighted: e.target.value })} />
          </CollegeField>
          <CollegeField label="Class rank">
            <CollegeInput value={a.classRank} onChange={(e) => patch({ classRank: e.target.value })} placeholder="e.g. 15 / 420 or top 5%" />
          </CollegeField>
          <CollegeField label="Class size">
            <CollegeInput value={a.classSize} onChange={(e) => patch({ classSize: e.target.value })} />
          </CollegeField>
        </CollegeGrid>
      </CollegeCard>

      <CollegeCard title="Rigor & coursework">
        <CollegeGrid>
          <CollegeField label="AP courses (count)">
            <CollegeInput
              type="number"
              min={0}
              max={20}
              value={a.apCount}
              onChange={(e) => setApCount(e.target.value)}
              placeholder="0"
            />
          </CollegeField>
          <CollegeField label="IB courses (count)">
            <CollegeInput
              type="number"
              min={0}
              max={20}
              value={a.ibCount}
              onChange={(e) => setIbCount(e.target.value)}
              placeholder="0"
            />
          </CollegeField>
          <CollegeField label="Honors courses (count)">
            <CollegeInput value={a.honorsCount} onChange={(e) => patch({ honorsCount: e.target.value })} />
          </CollegeField>
          <CollegeField label="Dual enrollment (count)">
            <CollegeInput value={a.dualEnrollmentCount} onChange={(e) => patch({ dualEnrollmentCount: e.target.value })} />
          </CollegeField>
        </CollegeGrid>

        {(a.apCourses || []).length > 0 && (
          <div className="college-course-score-section">
            <h4 className="college-course-score-heading">AP courses &amp; scores</h4>
            <CourseScoreGrid
              entries={a.apCourses}
              courses={AP_COURSES}
              scores={AP_SCORES}
              onChange={(apCourses) => patch({ apCourses })}
            />
          </div>
        )}

        {(a.ibCourses || []).length > 0 && (
          <div className="college-course-score-section">
            <h4 className="college-course-score-heading">IB courses &amp; scores</h4>
            <CourseScoreGrid
              entries={a.ibCourses}
              courses={IB_COURSES}
              scores={IB_SCORES}
              onChange={(ibCourses) => patch({ ibCourses })}
            />
          </div>
        )}

        <div className="college-card-fields-stack">
          <CollegeField label="Courseload summary" hint="Brief overview of rigor">
            <CollegeTextarea rows={2} value={a.courseloadSummary} onChange={(e) => patch({ courseloadSummary: e.target.value })} />
          </CollegeField>
          <CollegeField label="Current year classes">
            <CollegeTextarea rows={3} value={a.currentClasses} onChange={(e) => patch({ currentClasses: e.target.value })} placeholder="One class per line" />
          </CollegeField>
          <CollegeField label="Planned senior-year classes">
            <CollegeTextarea rows={3} value={a.plannedClasses} onChange={(e) => patch({ plannedClasses: e.target.value })} />
          </CollegeField>
          <CollegeField label="Dual enrollment / college coursework">
            <CollegeTextarea rows={2} value={a.dualEnrollment} onChange={(e) => patch({ dualEnrollment: e.target.value })} />
          </CollegeField>
        </div>
      </CollegeCard>

      <CollegeCard title="Interests">
        <CollegeField label="Intended major(s)" hint="Up to 5 — select from the list">
          <div className="college-major-list">
            {majors.map((major, i) => (
              <div key={`major-${i}`} className="college-major-row">
                <CollegeSelect value={major} onChange={(e) => updateMajor(i, e.target.value)}>
                  <option value="">Select major…</option>
                  {COLLEGE_MAJORS.map((m) => <option key={m} value={m}>{m}</option>)}
                </CollegeSelect>
                {majors.length > 1 && (
                  <button type="button" className="college-icon-btn" onClick={() => removeMajor(i)} aria-label="Remove major">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {majors.length < 5 && (
              <button type="button" className="college-btn college-btn--sm college-btn--ghost" onClick={addMajor}>
                <Plus size={14} /> Add major
              </button>
            )}
          </div>
        </CollegeField>
        <CollegeField label="Context notes" hint="School-specific explanations (block schedule, grade inflation, etc.)">
          <CollegeTextarea rows={3} value={a.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </CollegeField>
      </CollegeCard>
    </div>
  );
}
