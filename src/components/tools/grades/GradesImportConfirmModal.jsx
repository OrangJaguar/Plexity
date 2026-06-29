import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import {
  assignmentPercent,
  formatPercent,
  formatScore,
  percentToLetter,
} from '@/lib/tools/grade-calc';
import { letterGradeClass } from '@/lib/tools/grade-colors';

export default function GradesImportConfirmModal({
  open,
  onOpenChange,
  assignments: initial,
  hint,
  totalPoints,
  onSubmit,
}) {
  const [rows, setRows] = useState([]);

  const handleOpenChange = (next) => {
    if (next) setRows(initial.map((a) => ({ ...a })));
    onOpenChange(next);
  };

  const updateRow = (idx, patch) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRow = (idx) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    await onSubmit(rows.filter((r) => r.title?.trim() && r.pointsPossible));
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={handleOpenChange} title="Confirm import" maxWidth="640px">
      {hint ? <p className="tools-settings-hint">{hint}</p> : null}
      {totalPoints ? (
        <p className="tools-settings-hint">
          Export total:
          {' '}
          {totalPoints.earned}
          /
          {totalPoints.possible}
        </p>
      ) : null}
      <div className="tools-grades-import-table-wrap">
        <table className="tools-grades-import-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Score</th>
              <th>%</th>
              <th>Grade</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const pct = assignmentPercent(row.pointsEarned, row.pointsPossible);
              const letter = percentToLetter(pct);
              return (
                <tr key={row.assignmentId || idx}>
                  <td>
                    <input
                      className="tools-settings-input"
                      type="text"
                      value={row.title}
                      onChange={(e) => updateRow(idx, { title: e.target.value })}
                    />
                  </td>
                  <td>
                    <div className="tools-grades-score-inputs">
                      <input
                        className="tools-settings-input"
                        type="number"
                        min="0"
                        placeholder="—"
                        value={row.pointsEarned ?? ''}
                        onChange={(e) => updateRow(idx, {
                          pointsEarned: e.target.value === '' ? null : Number(e.target.value),
                        })}
                      />
                      <span>/</span>
                      <input
                        className="tools-settings-input"
                        type="number"
                        min="1"
                        value={row.pointsPossible ?? ''}
                        onChange={(e) => updateRow(idx, {
                          pointsPossible: Number(e.target.value) || 0,
                        })}
                      />
                    </div>
                  </td>
                  <td>{formatPercent(pct)}</td>
                  <td>
                    <span className={`tools-grade-letter ${letterGradeClass(letter)}`}>{letter}</span>
                  </td>
                  <td>
                    <button type="button" className="btn btn-sm" onClick={() => removeRow(idx)} aria-label="Remove">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="tools-form-actions">
        <span />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={!rows.length}>
            Save to class
          </button>
        </div>
      </div>
    </ToolsModal>
  );
}
