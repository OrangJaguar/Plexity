import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { createEvalContext, tryEvaluate } from '@/lib/tools/calculator/engine/evaluator';
import { formatCoord } from '@/lib/tools/calculator/format-coord';
import { defaultTableRows, expressionDisplayLabel } from '@/lib/tools/calculator/table-utils';
import LinePreview from '@/components/tools/calculator/LinePreview';

function computeY(item, scope, x) {
  if (!item?.graphable) return null;
  const ctx = createEvalContext({ vars: scope.vars, funcs: scope.funcs, angleMode: scope.angleMode, x });
  const r = tryEvaluate(item.graphable.body, ctx);
  return r.ok && Number.isFinite(r.value) ? r.value : null;
}

export default function FunctionTable({
  compiled,
  scope,
  expression,
  sourceExpression,
  color,
  visible = true,
  onToggleVisible,
  onUpdateRows,
  editMode,
  onDelete,
  onDuplicate,
  rowIndex,
}) {
  const sourceId = expression.meta?.sourceId;
  const item = compiled.find((c) => c.id === sourceId);
  const rows = expression.meta?.rows?.length ? expression.meta.rows : defaultTableRows();
  const fnLabel = expressionDisplayLabel(sourceExpression?.raw || item?.raw);

  const computed = useMemo(() => (
    rows.map((row) => ({
      x: row.x,
      y: computeY(item, scope, row.x),
    }))
  ), [rows, item, scope]);

  const updateX = (index, value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const next = rows.map((r, i) => (i === index ? { x: n } : r));
    onUpdateRows(next);
  };

  const addRow = () => {
    const last = rows[rows.length - 1]?.x ?? 0;
    onUpdateRows([...rows, { x: last + 1 }]);
  };

  if (!item?.graphable) {
    return (
      <div className="calc-expr-row calc-expr-row--table">
        <LinePreview color={color} kind="table" visible={visible} onClick={onToggleVisible} />
        <div className="calc-inline-table-empty">Pick a graphable expression in edit mode</div>
      </div>
    );
  }

  return (
    <div className={`calc-desmos-table ${editMode ? 'is-edit-mode' : ''}`}>
      <div className="calc-desmos-table-head">
        <span className="calc-desmos-table-x-head">x</span>
        <span className="calc-desmos-table-y-head">
          <LinePreview color={color} kind="curve" visible={visible} onClick={onToggleVisible} />
          <span className="calc-desmos-table-fn">{fnLabel}</span>
        </span>
        {editMode ? (
          <div className="calc-expr-row-edit-actions">
            <button type="button" className="calc-expr-action-btn" onClick={onDuplicate} title="Duplicate">⧉</button>
            <button type="button" className="calc-expr-action-btn" onClick={onDelete} title="Delete">×</button>
          </div>
        ) : null}
      </div>
      <div className="calc-desmos-table-body">
        {computed.map((row, i) => (
          <div className="calc-desmos-table-row" key={`${expression.id}-${i}`}>
            <div className="calc-desmos-table-x">
              <input
                type="number"
                value={row.x}
                onChange={(e) => updateX(i, e.target.value)}
                aria-label={`x value row ${i + 1}`}
              />
            </div>
            <div className="calc-desmos-table-y">
              {row.y === null ? '—' : formatCoord(row.y, 7)}
            </div>
          </div>
        ))}
        <button type="button" className="calc-desmos-table-add" onClick={addRow}>
          <Plus size={14} /> Add row
        </button>
        <div className="calc-expr-list-fade" aria-hidden />
      </div>
    </div>
  );
}
