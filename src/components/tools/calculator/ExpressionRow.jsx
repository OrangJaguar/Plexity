import { Copy, Table2, X } from 'lucide-react';
import MathEditor from '@/components/tools/calculator/MathEditor';
import LinePreview from '@/components/tools/calculator/LinePreview';
import FunctionTable from '@/components/tools/calculator/FunctionTable';

export default function ExpressionRow({
  expression,
  compiled,
  allCompiled,
  scope,
  expressions,
  definedSymbols,
  rowIndex,
  editMode,
  onChange,
  onToggleVisible,
  onDelete,
  onDuplicate,
  onConvertToTable,
  onFocusNext,
  onUpdateTableRows,
  autoFocus,
}) {
  const isTable = expression.meta?.rowType === 'table';

  if (isTable) {
    const sourceExpression = expressions.find((e) => e.id === expression.meta?.sourceId);
    return (
      <FunctionTable
        compiled={allCompiled}
        scope={scope}
        expression={expression}
        sourceExpression={sourceExpression}
        color={expression.color}
        visible={expression.visible}
        onToggleVisible={onToggleVisible}
        onUpdateRows={(rows) => onUpdateTableRows(expression.id, rows)}
        editMode={editMode}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        rowIndex={rowIndex}
      />
    );
  }

  const error = compiled?.error || expression.error;
  const previewKind = compiled?.kind === 'point' ? 'point' : 'curve';

  return (
    <div className={`calc-expr-row ${expression.visible ? '' : 'is-hidden'} ${editMode ? 'is-edit-mode' : ''}`}>
      <LinePreview
        color={expression.color}
        kind={previewKind}
        visible={expression.visible}
        onClick={onToggleVisible}
      />
      <div className="calc-expr-row-body">
        <MathEditor
          value={expression.raw}
          onChange={(raw) => onChange({ raw })}
          onSubmit={onFocusNext}
          error={error}
          definedSymbols={definedSymbols}
          autoFocus={autoFocus}
          rowIndex={editMode ? rowIndex : null}
        />
      </div>
      {editMode ? (
        <div className="calc-expr-row-edit-actions">
          {compiled?.graphable ? (
            <button type="button" className="calc-expr-action-btn" onClick={onConvertToTable} title="Convert to table"><Table2 size={15} /></button>
          ) : null}
          <button type="button" className="calc-expr-action-btn" onClick={onDuplicate} title="Duplicate"><Copy size={15} /></button>
          <button type="button" className="calc-expr-action-btn" onClick={onDelete} title="Delete"><X size={15} /></button>
        </div>
      ) : (
        <button type="button" className="calc-expr-delete-btn" onClick={onDelete} aria-label="Delete"><X size={14} /></button>
      )}
    </div>
  );
}
