import { useRef, useState } from 'react';
import { ChevronLeft, Plus, Redo2, Settings, Undo2 } from 'lucide-react';
import { createExpression } from '@/lib/tools/calculator/calculator-model';
import { defaultTableRows } from '@/lib/tools/calculator/table-utils';
import ExpressionRow from '@/components/tools/calculator/ExpressionRow';

export default function ExpressionPanel({
  expressions,
  compiledMap,
  compiled,
  scope,
  definedSymbols,
  editMode,
  onEditModeChange,
  onUpdateExpression,
  onAddExpression,
  onDeleteExpression,
  onDuplicateExpression,
  onConvertToTable,
  onUpdateTableRows,
  onToggleCollapse,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  const [plusOpen, setPlusOpen] = useState(false);
  const [focusId, setFocusId] = useState(null);
  const listRef = useRef(null);

  const sorted = [...expressions].sort((a, b) => a.order - b.order);

  const addBlankRow = () => {
    const expr = createExpression({ order: expressions.length, raw: '' });
    onAddExpression(expr);
    setFocusId(expr.id);
    setPlusOpen(false);
  };

  const addTableRow = () => {
    const source = expressions.find((e) => {
      const c = compiledMap[e.id];
      return c?.graphable && !c.error && e.visible;
    });
    const expr = createExpression({
      order: expressions.length,
      raw: '',
      kind: 'table',
      meta: { rowType: 'table', sourceId: source?.id || null, rows: defaultTableRows() },
    });
    onAddExpression(expr);
    setPlusOpen(false);
  };

  const handleListClick = (e) => {
    if (editMode) return;
    const list = listRef.current;
    if (!list) return;
    const rect = list.getBoundingClientRect();
    if (e.clientY >= rect.bottom - 56) addBlankRow();
  };

  const focusNextAfter = (id) => {
    const idx = sorted.findIndex((e) => e.id === id);
    if (idx === sorted.length - 1) {
      addBlankRow();
      return;
    }
    setFocusId(sorted[idx + 1]?.id || null);
  };

  return (
    <aside className="calc-expr-panel">
      <div className="calc-expr-panel-header">
        <div className="calc-expr-panel-left">
          <div className="calc-plus-menu-wrap">
            <button type="button" className="calc-panel-icon-btn" onClick={() => setPlusOpen((v) => !v)} aria-label="Add item" title="Add">
              <Plus size={18} />
            </button>
            {plusOpen ? (
              <div className="calc-plus-menu">
                <button type="button" onClick={addBlankRow}>Expression</button>
                <button type="button" onClick={addTableRow}>Table</button>
              </div>
            ) : null}
          </div>
          <button type="button" className="calc-panel-icon-btn" onClick={onUndo} disabled={!canUndo} title="Undo"><Undo2 size={16} /></button>
          <button type="button" className="calc-panel-icon-btn" onClick={onRedo} disabled={!canRedo} title="Redo"><Redo2 size={16} /></button>
        </div>
        <div className="calc-expr-panel-right">
          {editMode ? (
            <button type="button" className="calc-panel-done-btn" onClick={() => onEditModeChange(false)}>Done</button>
          ) : (
            <button type="button" className="calc-panel-icon-btn" onClick={() => onEditModeChange(true)} aria-label="Edit list" title="Edit list"><Settings size={16} /></button>
          )}
          <button type="button" className="calc-panel-icon-btn" onClick={onToggleCollapse} aria-label="Hide expressions" title="Hide expressions"><ChevronLeft size={16} /></button>
        </div>
      </div>
      <div className="calc-expr-list" ref={listRef} onClick={handleListClick}>
        {sorted.map((expr, i) => (
          <ExpressionRow
            key={expr.id}
            expression={expr}
            compiled={compiledMap[expr.id]}
            allCompiled={compiled}
            scope={scope}
            expressions={expressions}
            definedSymbols={definedSymbols}
            rowIndex={i + 1}
            editMode={editMode}
            autoFocus={focusId === expr.id}
            onChange={(patch) => onUpdateExpression(expr.id, patch)}
            onToggleVisible={() => onUpdateExpression(expr.id, { visible: !expr.visible })}
            onDelete={() => onDeleteExpression(expr.id)}
            onDuplicate={() => onDuplicateExpression(expr.id)}
            onConvertToTable={() => onConvertToTable(expr.id)}
            onUpdateTableRows={onUpdateTableRows}
            onFocusNext={() => focusNextAfter(expr.id)}
          />
        ))}
        <div className="calc-expr-list-tail" onClick={addBlankRow} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && addBlankRow()} aria-label="Add expression" />
      </div>
    </aside>
  );
}
