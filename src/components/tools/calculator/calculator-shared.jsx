import { AlertCircle, Eye, EyeOff, GripVertical, MoreHorizontal } from 'lucide-react';

export function ExpressionColorDot({ color, onClick }) {
  return (
    <button
      type="button"
      className="calc-color-dot"
      style={{ backgroundColor: color }}
      onClick={onClick}
      aria-label="Change color"
    />
  );
}

export function ExpressionErrorChip({ message }) {
  if (!message) return null;
  return (
    <span className="calc-error-chip" title={message}>
      <AlertCircle size={12} />
      <span>{message}</span>
    </span>
  );
}

export function ExpressionStateBadge({ state }) {
  if (state === 'inactive') return <span className="calc-state-badge is-inactive">Inactive</span>;
  if (state === 'error') return <span className="calc-state-badge is-error">Error</span>;
  return null;
}

export function ExactBadge({ exact }) {
  return (
    <span className={`calc-exact-badge ${exact ? 'is-exact' : 'is-approx'}`}>
      {exact ? 'Exact' : 'Approximate'}
    </span>
  );
}

export function VisibilityToggle({ visible, onToggle }) {
  return (
    <button type="button" className="calc-icon-btn" onClick={onToggle} aria-label={visible ? 'Hide' : 'Show'}>
      {visible ? <Eye size={14} /> : <EyeOff size={14} />}
    </button>
  );
}

export function DragHandle() {
  return <span className="calc-drag-handle"><GripVertical size={14} /></span>;
}

export function RowMenuButton({ onClick }) {
  return (
    <button type="button" className="calc-icon-btn" onClick={onClick} aria-label="More options">
      <MoreHorizontal size={14} />
    </button>
  );
}
