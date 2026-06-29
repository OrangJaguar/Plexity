import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import {
  CharCounter, CollegeCard, CollegeField, CollegeGrid, CollegeInput,
  CollegePageHeader, CollegeSelect, CollegeTextarea,
} from '@/components/tools/college/college-shared';
import { ACTIVITY_CATEGORIES, newActivity } from '@/lib/tools/college/college-model';

const SHORT_LIMIT = 150;

export default function CollegeActivities({ doc, updateDoc }) {
  const activities = [...(doc.activities || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const [selectedId, setSelectedId] = useState(activities[0]?.id || null);

  const selected = activities.find((a) => a.id === selectedId);
  const selectedIndex = activities.findIndex((a) => a.id === selectedId);

  const saveList = (list) => updateDoc({
    activities: list.map((a, i) => ({ ...a, sortOrder: i })),
  });

  const updateSelected = (patch) => {
    if (!selected) return;
    saveList(activities.map((a) => (a.id === selected.id ? { ...a, ...patch } : a)));
  };

  const addActivity = () => {
    const item = newActivity(activities.length);
    const next = [...activities, item];
    saveList(next);
    setSelectedId(item.id);
  };

  const removeActivity = (id) => {
    const next = activities.filter((a) => a.id !== id);
    saveList(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };

  const move = (dir) => {
    if (selectedIndex < 0) return;
    const next = [...activities];
    const swap = selectedIndex + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[selectedIndex], next[swap]] = [next[swap], next[selectedIndex]];
    saveList(next);
  };

  return (
    <div className="college-section college-section--editor">
      <CollegePageHeader
        title="Activities"
        description="Build your strongest 10 activities — order matters. Compress real work into application-ready language."
      />

      <div className="college-editor-layout">
        <div className="college-editor-list">
          <div className="college-editor-list-head">
            <span>{activities.length} / 10 recommended</span>
            <button type="button" className="college-btn college-btn--sm" onClick={addActivity} disabled={activities.length >= 15}>
              <Plus size={14} /> Add
            </button>
          </div>
          <ul>
            {activities.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={selectedId === a.id ? 'active' : ''}
                  onClick={() => setSelectedId(a.id)}
                >
                  <span className="college-editor-rank">{i + 1}</span>
                  <span>{a.name || 'Untitled activity'}</span>
                  {a.mostImportant ? <span className="college-tag">Key</span> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {selected ? (
          <div className="college-editor-detail">
            <div className="college-editor-detail-head">
              <div className="college-reorder-btns">
                <button type="button" className="college-icon-btn" onClick={() => move(-1)} disabled={selectedIndex <= 0}><ChevronUp size={16} /></button>
                <button type="button" className="college-icon-btn" onClick={() => move(1)} disabled={selectedIndex >= activities.length - 1}><ChevronDown size={16} /></button>
              </div>
              <button type="button" className="college-icon-btn" onClick={() => removeActivity(selected.id)}><Trash2 size={14} /></button>
            </div>

            <CollegeGrid>
              <CollegeField label="Activity name">
                <CollegeInput value={selected.name} onChange={(e) => updateSelected({ name: e.target.value })} />
              </CollegeField>
              <CollegeField label="Category">
                <CollegeSelect value={selected.category} onChange={(e) => updateSelected({ category: e.target.value })}>
                  <option value="">Select…</option>
                  {ACTIVITY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </CollegeSelect>
              </CollegeField>
              <CollegeField label="Organization">
                <CollegeInput value={selected.organization} onChange={(e) => updateSelected({ organization: e.target.value })} />
              </CollegeField>
              <CollegeField label="Role / title">
                <CollegeInput value={selected.role} onChange={(e) => updateSelected({ role: e.target.value })} />
              </CollegeField>
              <CollegeField label="Grade levels">
                <CollegeInput value={selected.gradeLevels} onChange={(e) => updateSelected({ gradeLevels: e.target.value })} placeholder="9, 10, 11, 12" />
              </CollegeField>
              <CollegeField label="Timing">
                <CollegeInput value={selected.timing} onChange={(e) => updateSelected({ timing: e.target.value })} placeholder="School year / summer / year-round" />
              </CollegeField>
              <CollegeField label="Hours per week">
                <CollegeInput value={selected.hoursPerWeek} onChange={(e) => updateSelected({ hoursPerWeek: e.target.value })} />
              </CollegeField>
              <CollegeField label="Weeks per year">
                <CollegeInput value={selected.weeksPerYear} onChange={(e) => updateSelected({ weeksPerYear: e.target.value })} />
              </CollegeField>
            </CollegeGrid>

            <label className="college-check">
              <input type="checkbox" checked={selected.stillParticipating} onChange={(e) => updateSelected({ stillParticipating: e.target.checked })} />
              Still participating
            </label>
            <label className="college-check">
              <input type="checkbox" checked={selected.mostImportant} onChange={(e) => updateSelected({ mostImportant: e.target.checked })} />
              Mark as most important
            </label>

            <CollegeField label="Short description (Common App style)" hint="150 characters">
              <div className="college-field-with-counter">
                <CollegeTextarea rows={2} maxLength={SHORT_LIMIT} value={selected.shortDescription} onChange={(e) => updateSelected({ shortDescription: e.target.value })} />
                <CharCounter value={selected.shortDescription} max={SHORT_LIMIT} warnAt={130} />
              </div>
            </CollegeField>

            <CollegeField label="Master description">
              <CollegeTextarea rows={4} value={selected.masterDescription} onChange={(e) => updateSelected({ masterDescription: e.target.value })} />
            </CollegeField>

            <CollegeField label="Impact metrics" hint="What did you build? How many people affected? Measurable outcomes?">
              <CollegeTextarea rows={3} value={selected.impactMetrics} onChange={(e) => updateSelected({ impactMetrics: e.target.value })} />
            </CollegeField>

            <CollegeField label="Personal significance">
              <CollegeTextarea rows={2} value={selected.significance} onChange={(e) => updateSelected({ significance: e.target.value })} />
            </CollegeField>
          </div>
        ) : (
          <CollegeCard title="No activities yet">
            <p className="college-muted">Add your first activity to start building your list.</p>
          </CollegeCard>
        )}
      </div>
    </div>
  );
}
