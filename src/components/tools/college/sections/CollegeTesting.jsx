import { Plus, Trash2 } from 'lucide-react';
import {
  CollegeCard, CollegeField, CollegeGrid, CollegeInput, CollegePageHeader, CollegeSelect, CollegeTextarea,
} from '@/components/tools/college/college-shared';
import { newId } from '@/lib/tools/college/college-model';
import { AP_SCORES, getApExamOptions, SCORE_LABELS } from '@/lib/tools/college/college-ap-ib';
import { computeBestScores } from '@/lib/tools/college/college-stats';

export default function CollegeTesting({ doc, updateDoc }) {
  const t = doc.testing || { satAttempts: [], actAttempts: [], apExams: [], plannedDates: '' };
  const { bestSat, bestAct, superscoreSat } = computeBestScores(t);
  const apExamOptions = getApExamOptions(undefined, t);

  const patchTesting = (patch) => updateDoc({ testing: { ...t, ...patch } });

  const updateList = (key, list) => patchTesting({ [key]: list });

  const addSat = () => updateList('satAttempts', [...t.satAttempts, { id: newId(), date: '', erw: '', math: '', total: '' }]);
  const addAct = () => updateList('actAttempts', [...t.actAttempts, { id: newId(), date: '', english: '', math: '', reading: '', science: '', composite: '' }]);
  const addAp = () => updateList('apExams', [...t.apExams, { id: newId(), exam: '', year: '', score: '' }]);

  return (
    <div className="college-section">
      <CollegePageHeader
        title="Testing"
        description="Track scores here; per-college submit/withhold decisions live on each school."
      />

      <div className="college-kpi-row college-kpi-row--testing">
        <div className="college-kpi"><span className="college-kpi-label">Best SAT</span><strong className="college-kpi-value">{bestSat || '—'}</strong></div>
        <div className="college-kpi"><span className="college-kpi-label">Best ACT</span><strong className="college-kpi-value">{bestAct || '—'}</strong></div>
        <div className="college-kpi college-kpi--wide"><span className="college-kpi-label">SAT Superscore</span><strong className="college-kpi-value">{superscoreSat || '—'}</strong></div>
      </div>

      <p className="college-guidance-note">
        Some colleges superscore SAT sections; others review your best single sitting. Check each school&apos;s policy before submitting.
      </p>

      <CollegeCard title="SAT attempts">
        {t.satAttempts.map((a, i) => (
          <div key={a.id} className="college-attempt-row">
            <CollegeGrid>
              <CollegeField label="Date"><CollegeInput value={a.date} onChange={(e) => { const n = [...t.satAttempts]; n[i] = { ...a, date: e.target.value }; updateList('satAttempts', n); }} /></CollegeField>
              <CollegeField label="ERW"><CollegeInput value={a.erw} onChange={(e) => { const n = [...t.satAttempts]; n[i] = { ...a, erw: e.target.value }; updateList('satAttempts', n); }} /></CollegeField>
              <CollegeField label="Math"><CollegeInput value={a.math} onChange={(e) => { const n = [...t.satAttempts]; n[i] = { ...a, math: e.target.value }; updateList('satAttempts', n); }} /></CollegeField>
              <CollegeField label="Total"><CollegeInput value={a.total} onChange={(e) => { const n = [...t.satAttempts]; n[i] = { ...a, total: e.target.value }; updateList('satAttempts', n); }} /></CollegeField>
            </CollegeGrid>
            <button type="button" className="college-icon-btn" onClick={() => updateList('satAttempts', t.satAttempts.filter((x) => x.id !== a.id))}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="college-btn college-btn--sm" onClick={addSat}><Plus size={14} /> Add SAT</button>
      </CollegeCard>

      <CollegeCard title="ACT attempts">
        {t.actAttempts.map((a, i) => (
          <div key={a.id} className="college-attempt-row">
            <CollegeGrid>
              <CollegeField label="Date"><CollegeInput value={a.date} onChange={(e) => { const n = [...t.actAttempts]; n[i] = { ...a, date: e.target.value }; updateList('actAttempts', n); }} /></CollegeField>
              <CollegeField label="English"><CollegeInput value={a.english} onChange={(e) => { const n = [...t.actAttempts]; n[i] = { ...a, english: e.target.value }; updateList('actAttempts', n); }} /></CollegeField>
              <CollegeField label="Math"><CollegeInput value={a.math} onChange={(e) => { const n = [...t.actAttempts]; n[i] = { ...a, math: e.target.value }; updateList('actAttempts', n); }} /></CollegeField>
              <CollegeField label="Reading"><CollegeInput value={a.reading} onChange={(e) => { const n = [...t.actAttempts]; n[i] = { ...a, reading: e.target.value }; updateList('actAttempts', n); }} /></CollegeField>
              <CollegeField label="Science"><CollegeInput value={a.science} onChange={(e) => { const n = [...t.actAttempts]; n[i] = { ...a, science: e.target.value }; updateList('actAttempts', n); }} /></CollegeField>
              <CollegeField label="Composite"><CollegeInput value={a.composite} onChange={(e) => { const n = [...t.actAttempts]; n[i] = { ...a, composite: e.target.value }; updateList('actAttempts', n); }} /></CollegeField>
            </CollegeGrid>
            <button type="button" className="college-icon-btn" onClick={() => updateList('actAttempts', t.actAttempts.filter((x) => x.id !== a.id))}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="college-btn college-btn--sm" onClick={addAct}><Plus size={14} /> Add ACT</button>
      </CollegeCard>

      <CollegeCard title="AP exams">
        {t.apExams.map((a, i) => (
          <div key={a.id} className="college-attempt-row">
            <CollegeGrid>
              <CollegeField label="Exam">
                <CollegeSelect
                  value={a.exam}
                  onChange={(e) => {
                    const n = [...t.apExams];
                    n[i] = { ...a, exam: e.target.value };
                    updateList('apExams', n);
                  }}
                >
                  <option value="">Select exam…</option>
                  {apExamOptions.map((exam) => (
                    <option key={exam} value={exam}>{exam}</option>
                  ))}
                  {a.exam && !apExamOptions.includes(a.exam) ? (
                    <option value={a.exam}>{a.exam}</option>
                  ) : null}
                </CollegeSelect>
              </CollegeField>
              <CollegeField label="Year"><CollegeInput value={a.year} onChange={(e) => { const n = [...t.apExams]; n[i] = { ...a, year: e.target.value }; updateList('apExams', n); }} /></CollegeField>
              <CollegeField label="Score">
                <CollegeSelect
                  value={a.score}
                  onChange={(e) => {
                    const n = [...t.apExams];
                    n[i] = { ...a, score: e.target.value };
                    updateList('apExams', n);
                  }}
                >
                  <option value="">Score…</option>
                  {AP_SCORES.map((s) => (
                    <option key={s} value={s}>{SCORE_LABELS[s] || s}</option>
                  ))}
                </CollegeSelect>
              </CollegeField>
            </CollegeGrid>
            <button type="button" className="college-icon-btn" onClick={() => updateList('apExams', t.apExams.filter((x) => x.id !== a.id))}><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" className="college-btn college-btn--sm" onClick={addAp}><Plus size={14} /> Add AP</button>
      </CollegeCard>

      <CollegeCard title="Planned test dates">
        <CollegeTextarea rows={2} value={t.plannedDates} onChange={(e) => patchTesting({ plannedDates: e.target.value })} placeholder="Upcoming SAT/ACT dates" />
      </CollegeCard>
    </div>
  );
}
