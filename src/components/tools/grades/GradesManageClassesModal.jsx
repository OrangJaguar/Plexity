import { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import { createEmptyCourse } from '@/lib/tools/grade-periods';

export default function GradesManageClassesModal({
  open,
  onOpenChange,
  courses,
  periodSystem = 'quarter',
  categorySuggestions = [],
  onSave,
}) {
  const [rows, setRows] = useState([]);

  const syncFromProps = () => {
    setRows(courses.map((c) => ({ ...c })));
  };

  const handleOpenChange = (next) => {
    if (next) syncFromProps();
    onOpenChange(next);
  };

  const addRow = (name = '') => {
    const sortOrder = rows.length;
    setRows((prev) => [...prev, createEmptyCourse(name || 'New class', periodSystem, sortOrder)]);
  };

  const move = (idx, dir) => {
    const next = [...rows];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setRows(next.map((c, i) => ({ ...c, sortOrder: i })));
  };

  const handleSave = async () => {
    const cleaned = rows
      .map((c, i) => ({ ...c, name: c.name.trim(), sortOrder: i }))
      .filter((c) => c.name);
    await onSave(cleaned);
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={handleOpenChange} title="Adjust classes" maxWidth="520px">
      <p className="tools-settings-lead">Add, rename, or remove your courses.</p>
      {categorySuggestions.length > 0 && (
        <div className="tools-grades-suggestion-chips">
          {categorySuggestions.map((name) => (
            <button key={name} type="button" className="btn btn-sm" onClick={() => addRow(name)}>
              + {name}
            </button>
          ))}
        </div>
      )}
      <div className="tools-grades-class-list">
        {rows.map((row, idx) => (
          <div key={row.courseId} className="tools-grades-class-row">
            <input
              className="tools-settings-input"
              type="text"
              value={row.name}
              onChange={(e) => setRows((prev) => prev.map((c, i) => (
                i === idx ? { ...c, name: e.target.value } : c
              )))}
            />
            <div className="tools-grades-class-row-actions">
              <button type="button" className="btn btn-sm" onClick={() => move(idx, -1)} aria-label="Move up">
                <ChevronUp size={14} />
              </button>
              <button type="button" className="btn btn-sm" onClick={() => move(idx, 1)} aria-label="Move down">
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="Remove"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm" onClick={() => addRow()}>
        <Plus size={14} />
        {' '}
        Add class
      </button>
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
