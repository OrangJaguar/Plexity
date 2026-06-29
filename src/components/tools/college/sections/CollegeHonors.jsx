import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  CollegeCard, CollegeField, CollegeGrid, CollegeInput, CollegePageHeader, CollegeSelect, CollegeTextarea,
} from '@/components/tools/college/college-shared';
import { HONOR_LEVELS, newHonor } from '@/lib/tools/college/college-model';

export default function CollegeHonors({ doc, updateDoc }) {
  const honors = [...(doc.honors || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const [selectedId, setSelectedId] = useState(honors[0]?.id || null);

  const topFive = honors.filter((h) => h.inTopFive).slice(0, 5);
  const overflow = honors.filter((h) => !h.inTopFive);
  const selected = honors.find((h) => h.id === selectedId);
  const selectedIndex = honors.findIndex((h) => h.id === selectedId);

  const saveList = (list) => updateDoc({
    honors: list.map((h, i) => ({ ...h, sortOrder: i })),
  });

  const updateSelected = (patch) => {
    if (!selected) return;
    saveList(honors.map((h) => (h.id === selected.id ? { ...h, ...patch } : h)));
  };

  const addHonor = () => {
    const inTopFive = honors.filter((h) => h.inTopFive).length < 5;
    const item = { ...newHonor(honors.length), inTopFive };
    const next = [...honors, item];
    saveList(next);
    setSelectedId(item.id);
  };

  const move = (dir) => {
    if (selectedIndex < 0) return;
    const next = [...honors];
    const swap = selectedIndex + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[selectedIndex], next[swap]] = [next[swap], next[selectedIndex]];
    saveList(next);
  };

  const toggleTopFive = (id, on) => {
    const currentTop = honors.filter((h) => h.inTopFive).length;
    if (on && currentTop >= 5) return;
    saveList(honors.map((h) => (h.id === id ? { ...h, inTopFive: on } : h)));
  };

  return (
    <div className="college-section college-section--editor">
      <CollegePageHeader
        title="Honors"
        description="Common App allows five honors — choose and order your strongest academic recognitions."
      />

      <CollegeCard title="Top 5 honors">
        {topFive.length ? (
          <ul className="college-honor-top-list">
            {topFive.map((h, i) => (
              <li key={h.id}>
                <button type="button" className={selectedId === h.id ? 'active' : ''} onClick={() => setSelectedId(h.id)}>
                  <span>{i + 1}.</span> {h.title || 'Untitled honor'}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="college-muted">Select up to five honors below for your application shortlist.</p>
        )}
      </CollegeCard>

      <div className="college-editor-layout">
        <div className="college-editor-list">
          <div className="college-editor-list-head">
            <span>All honors</span>
            <button type="button" className="college-btn college-btn--sm" onClick={addHonor}><Plus size={14} /> Add</button>
          </div>
          <ul>
            {honors.map((h) => (
              <li key={h.id}>
                <button type="button" className={selectedId === h.id ? 'active' : ''} onClick={() => setSelectedId(h.id)}>
                  {h.title || 'Untitled'}
                  {h.inTopFive ? <span className="college-tag">Top 5</span> : null}
                </button>
              </li>
            ))}
          </ul>
          {overflow.length > 0 && (
            <p className="college-muted college-overflow-note">{overflow.length} additional honor(s) not in top 5</p>
          )}
        </div>

        {selected ? (
          <div className="college-editor-detail">
            <div className="college-editor-detail-head">
              <div className="college-reorder-btns">
                <button type="button" className="college-icon-btn" onClick={() => move(-1)} disabled={selectedIndex <= 0}><ChevronUp size={16} /></button>
                <button type="button" className="college-icon-btn" onClick={() => move(1)} disabled={selectedIndex >= honors.length - 1}><ChevronDown size={16} /></button>
              </div>
              <button type="button" className="college-icon-btn" onClick={() => saveList(honors.filter((h) => h.id !== selected.id))}><Trash2 size={14} /></button>
            </div>

            <label className="college-check">
              <input type="checkbox" checked={selected.inTopFive} onChange={(e) => toggleTopFive(selected.id, e.target.checked)} />
              Include in top 5
            </label>

            <CollegeGrid>
              <CollegeField label="Title">
                <CollegeInput value={selected.title} onChange={(e) => updateSelected({ title: e.target.value })} />
              </CollegeField>
              <CollegeField label="Recognition level">
                <CollegeSelect value={selected.level} onChange={(e) => updateSelected({ level: e.target.value })}>
                  {HONOR_LEVELS.map((l) => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
                </CollegeSelect>
              </CollegeField>
              <CollegeField label="Grade level">
                <CollegeInput value={selected.gradeLevel} onChange={(e) => updateSelected({ gradeLevel: e.target.value })} />
              </CollegeField>
            </CollegeGrid>

            <CollegeField label="Short explanation">
              <CollegeTextarea rows={2} value={selected.explanation} onChange={(e) => updateSelected({ explanation: e.target.value })} />
            </CollegeField>
            <CollegeField label="Criteria / details (optional)">
              <CollegeTextarea rows={2} value={selected.criteria} onChange={(e) => updateSelected({ criteria: e.target.value })} />
            </CollegeField>
          </div>
        ) : null}
      </div>
    </div>
  );
}
