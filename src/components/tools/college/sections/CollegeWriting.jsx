import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  CollegeCard, CollegeField, CollegeGrid, CollegeInput, CollegePageHeader,
  CollegeSelect, CollegeTextarea,
} from '@/components/tools/college/college-shared';
import {
  ESSAY_STATUSES, ESSAY_TYPES, newMainEssay, newSupplemental, countWords,
} from '@/lib/tools/college/college-model';
import { essayTypeLabel } from '@/lib/tools/college/college-stats';
import { resolveCollegeName } from '@/lib/tools/college/college-catalog';

export default function CollegeWriting({ doc, updateDoc, focusCollegeId }) {
  const [subTab, setSubTab] = useState('main');
  const [filterCollege, setFilterCollege] = useState(focusCollegeId || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMainId, setSelectedMainId] = useState(doc.mainEssays?.[0]?.id || null);
  const [selectedSuppId, setSelectedSuppId] = useState(null);

  const mainEssays = doc.mainEssays || [];
  const supplementals = doc.supplementals || [];
  const myColleges = doc.myColleges || [];

  const selectedMain = mainEssays.find((e) => e.id === selectedMainId);
  const selectedSupp = supplementals.find((s) => s.id === selectedSuppId);

  const filteredSupps = useMemo(() => supplementals.filter((s) => {
    if (filterCollege !== 'all' && s.collegeId !== filterCollege) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  }), [supplementals, filterCollege, filterStatus]);

  const updateMain = (id, patch) => {
    updateDoc({
      mainEssays: mainEssays.map((e) => (e.id === id ? { ...e, ...patch, wordCount: countWords(patch.content ?? e.content) } : e)),
    });
  };

  const updateSupp = (id, patch) => {
    updateDoc({
      supplementals: supplementals.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  const addMainEssay = () => {
    const item = newMainEssay();
    updateDoc({ mainEssays: [...mainEssays, item] });
    setSelectedMainId(item.id);
    setSubTab('main');
  };

  const addAdditionalInfo = () => {
    const item = { ...newMainEssay(), title: 'Additional Information', type: 'additional_info' };
    updateDoc({ mainEssays: [...mainEssays, item] });
    setSelectedMainId(item.id);
    setSubTab('main');
  };

  const addSupplemental = () => {
    const collegeId = filterCollege !== 'all' ? filterCollege : myColleges[0]?.id || '';
    const item = newSupplemental(collegeId);
    updateDoc({ supplementals: [...supplementals, item] });
    setSelectedSuppId(item.id);
    setSubTab('supplementals');
  };

  return (
    <div className="college-section college-section--editor">
      <CollegePageHeader
        title="Writing"
        description="Personal statement and school-specific supplementals — tied to your college list."
      />

      <div className="college-subtabs">
        <button type="button" className={subTab === 'main' ? 'active' : ''} onClick={() => setSubTab('main')}>Main essays</button>
        <button type="button" className={subTab === 'supplementals' ? 'active' : ''} onClick={() => setSubTab('supplementals')}>Supplementals</button>
      </div>

      {subTab === 'main' && (
        <div className="college-editor-layout">
          <div className="college-editor-list">
            <div className="college-editor-list-head">
              <span>Essays</span>
              <div className="college-btn-group">
                <button type="button" className="college-btn college-btn--sm" onClick={addMainEssay}><Plus size={14} /> Draft</button>
                <button type="button" className="college-btn college-btn--sm college-btn--ghost" onClick={addAdditionalInfo}>+ Additional info</button>
              </div>
            </div>
            <ul>
              {mainEssays.map((e) => (
                <li key={e.id}>
                  <button type="button" className={selectedMainId === e.id ? 'active' : ''} onClick={() => setSelectedMainId(e.id)}>
                    {e.title || 'Untitled'}
                    {e.isBest ? <span className="college-tag">Best</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {selectedMain ? (
            <div className="college-editor-detail">
              <CollegeGrid>
                <CollegeField label="Title / label">
                  <CollegeInput value={selectedMain.title} onChange={(e) => updateMain(selectedMain.id, { title: e.target.value })} />
                </CollegeField>
                <CollegeField label="Theme / topic">
                  <CollegeInput value={selectedMain.theme} onChange={(e) => updateMain(selectedMain.id, { theme: e.target.value })} />
                </CollegeField>
                <CollegeField label="Status">
                  <CollegeSelect value={selectedMain.status} onChange={(e) => updateMain(selectedMain.id, { status: e.target.value })}>
                    {ESSAY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </CollegeSelect>
                </CollegeField>
              </CollegeGrid>
              <label className="college-check">
                <input type="checkbox" checked={selectedMain.isBest} onChange={(e) => updateMain(selectedMain.id, { isBest: e.target.checked })} />
                Mark as best version
              </label>
              <CollegeField label="Draft">
                <CollegeTextarea rows={12} value={selectedMain.content} onChange={(e) => updateMain(selectedMain.id, { content: e.target.value })} />
                <span className="college-muted">{countWords(selectedMain.content)} words</span>
              </CollegeField>
              <CollegeField label="Notes / feedback">
                <CollegeTextarea rows={2} value={selectedMain.notes} onChange={(e) => updateMain(selectedMain.id, { notes: e.target.value })} />
              </CollegeField>
              <button type="button" className="college-icon-btn" onClick={() => { updateDoc({ mainEssays: mainEssays.filter((e) => e.id !== selectedMain.id) }); setSelectedMainId(null); }}><Trash2 size={14} /></button>
            </div>
          ) : null}
        </div>
      )}

      {subTab === 'supplementals' && (
        <>
          <div className="college-filter-chips">
            <CollegeSelect value={filterCollege} onChange={(e) => setFilterCollege(e.target.value)}>
              <option value="all">All colleges</option>
              {myColleges.map((c) => <option key={c.id} value={c.id}>{resolveCollegeName(c)}</option>)}
            </CollegeSelect>
            <CollegeSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All statuses</option>
              {ESSAY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </CollegeSelect>
            <button type="button" className="college-btn college-btn--sm" onClick={addSupplemental}><Plus size={14} /> Add supplemental</button>
          </div>

          <div className="college-editor-layout">
            <div className="college-editor-list">
              <ul>
                {filteredSupps.map((s) => (
                  <li key={s.id}>
                    <button type="button" className={selectedSuppId === s.id ? 'active' : ''} onClick={() => setSelectedSuppId(s.id)}>
                      <span>{s.promptTitle || 'Supplemental'}</span>
                      <span className="college-muted">{resolveCollegeName(myColleges.find((c) => c.id === s.collegeId))}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {selectedSupp ? (
              <div className="college-editor-detail">
                <CollegeGrid>
                  <CollegeField label="College">
                    <CollegeSelect value={selectedSupp.collegeId} onChange={(e) => updateSupp(selectedSupp.id, { collegeId: e.target.value })}>
                      {myColleges.map((c) => <option key={c.id} value={c.id}>{resolveCollegeName(c)}</option>)}
                    </CollegeSelect>
                  </CollegeField>
                  <CollegeField label="Essay type">
                    <CollegeSelect value={selectedSupp.essayType} onChange={(e) => updateSupp(selectedSupp.id, { essayType: e.target.value })}>
                      {ESSAY_TYPES.map((t) => <option key={t} value={t}>{essayTypeLabel(t)}</option>)}
                    </CollegeSelect>
                  </CollegeField>
                  <CollegeField label="Status">
                    <CollegeSelect value={selectedSupp.status} onChange={(e) => updateSupp(selectedSupp.id, { status: e.target.value })}>
                      {ESSAY_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                    </CollegeSelect>
                  </CollegeField>
                  <CollegeField label="Word limit">
                    <CollegeInput value={selectedSupp.wordLimit} onChange={(e) => updateSupp(selectedSupp.id, { wordLimit: e.target.value })} />
                  </CollegeField>
                </CollegeGrid>
                <CollegeField label="Prompt title">
                  <CollegeInput value={selectedSupp.promptTitle} onChange={(e) => updateSupp(selectedSupp.id, { promptTitle: e.target.value })} />
                </CollegeField>
                <CollegeField label="Prompt text">
                  <CollegeTextarea rows={3} value={selectedSupp.promptText} onChange={(e) => updateSupp(selectedSupp.id, { promptText: e.target.value })} />
                </CollegeField>
                <CollegeField label="Draft">
                  <CollegeTextarea rows={10} value={selectedSupp.draftText} onChange={(e) => updateSupp(selectedSupp.id, { draftText: e.target.value })} />
                  <span className="college-muted">
                    {countWords(selectedSupp.draftText)} words
                    {selectedSupp.wordLimit ? ` / ${selectedSupp.wordLimit} limit` : ''}
                  </span>
                </CollegeField>
                <CollegeField label="Reused from / notes">
                  <CollegeTextarea rows={2} value={selectedSupp.notes} onChange={(e) => updateSupp(selectedSupp.id, { notes: e.target.value })} />
                </CollegeField>
              </div>
            ) : (
              <CollegeCard title="No supplemental selected">
                <p className="college-muted">Add supplementals from a college detail page or here.</p>
              </CollegeCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
