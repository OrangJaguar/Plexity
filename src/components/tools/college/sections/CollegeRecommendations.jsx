import { Plus, Trash2 } from 'lucide-react';
import {
  CollegeCard, CollegeField, CollegeGrid, CollegeInput, CollegePageHeader,
  CollegeSelect, CollegeTextarea,
} from '@/components/tools/college/college-shared';
import { newRecommender, RECOMMENDER_STATUSES, RECOMMENDER_TYPES } from '@/lib/tools/college/college-model';
import { resolveCollegeName } from '@/lib/tools/college/college-catalog';

export default function CollegeRecommendations({ doc, updateDoc }) {
  const recommenders = doc.recommenders || [];
  const myColleges = doc.myColleges || [];

  const saveList = (list) => updateDoc({ recommenders: list });

  const updateRec = (id, patch) => {
    saveList(recommenders.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const toggleCollege = (recId, collegeId) => {
    const rec = recommenders.find((r) => r.id === recId);
    if (!rec) return;
    const ids = rec.collegeIds || [];
    const next = ids.includes(collegeId) ? ids.filter((id) => id !== collegeId) : [...ids, collegeId];
    updateRec(recId, { collegeIds: next });
  };

  const collegesNeedingRecs = myColleges.filter((c) => {
    const assigned = recommenders.some((r) => r.collegeIds?.includes(c.id) && r.status === 'submitted');
    return !assigned;
  });

  return (
    <div className="college-section">
      <CollegePageHeader
        title="Recommendations"
        description="Track who you asked, what they owe, and which schools still need letters."
      />

      {collegesNeedingRecs.length > 0 && (
        <CollegeCard title="Schools still needing submitted recs">
          <ul className="college-mini-list">
            {collegesNeedingRecs.map((c) => (
              <li key={c.id}>{resolveCollegeName(c)}</li>
            ))}
          </ul>
        </CollegeCard>
      )}

      <div className="college-rec-toolbar">
        <button type="button" className="college-btn college-btn--sm" onClick={() => saveList([...recommenders, newRecommender()])}>
          <Plus size={14} /> Add recommender
        </button>
      </div>

      {recommenders.length ? (
        <table className="college-table college-table--recs">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Subject</th>
              <th>Status</th>
              <th>Colleges</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {recommenders.map((r) => (
              <tr key={r.id}>
                <td><CollegeInput value={r.name} onChange={(e) => updateRec(r.id, { name: e.target.value })} /></td>
                <td>
                  <CollegeSelect value={r.type} onChange={(e) => updateRec(r.id, { type: e.target.value })}>
                    {RECOMMENDER_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </CollegeSelect>
                </td>
                <td><CollegeInput value={r.subject} onChange={(e) => updateRec(r.id, { subject: e.target.value })} /></td>
                <td>
                  <CollegeSelect value={r.status} onChange={(e) => updateRec(r.id, { status: e.target.value })}>
                    {RECOMMENDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </CollegeSelect>
                </td>
                <td>
                  <div className="college-rec-colleges">
                    {myColleges.map((c) => (
                      <label key={c.id} className="college-check college-check--inline">
                        <input type="checkbox" checked={(r.collegeIds || []).includes(c.id)} onChange={() => toggleCollege(r.id, c.id)} />
                        {resolveCollegeName(c).split(' ')[0]}
                      </label>
                    ))}
                  </div>
                </td>
                <td>
                  <button type="button" className="college-icon-btn" onClick={() => saveList(recommenders.filter((x) => x.id !== r.id))}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <CollegeCard title="No recommenders yet">
          <p className="college-muted">Add teachers and your counselor to track requests and submissions.</p>
        </CollegeCard>
      )}

      {recommenders.map((r) => (
        <CollegeCard key={`detail-${r.id}`} title={r.name || 'Recommender details'} className="college-rec-detail-card">
          <CollegeGrid>
            <CollegeField label="Contact note (email — do not store sensitive IDs)">
              <CollegeInput value={r.contactNote} onChange={(e) => updateRec(r.id, { contactNote: e.target.value })} />
            </CollegeField>
            <CollegeField label="Request date">
              <CollegeInput type="date" value={r.requestDate} onChange={(e) => updateRec(r.id, { requestDate: e.target.value })} />
            </CollegeField>
          </CollegeGrid>
          <label className="college-check">
            <input type="checkbox" checked={r.thankYouSent} onChange={(e) => updateRec(r.id, { thankYouSent: e.target.checked })} />
            Thank-you sent
          </label>
          <CollegeField label="Notes">
            <CollegeTextarea rows={2} value={r.notes} onChange={(e) => updateRec(r.id, { notes: e.target.value })} />
          </CollegeField>
        </CollegeCard>
      ))}
    </div>
  );
}
