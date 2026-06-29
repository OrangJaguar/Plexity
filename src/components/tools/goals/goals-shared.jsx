import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil, Plus, X } from 'lucide-react';
import VeridianCheckbox from '@/components/shared/form/VeridianCheckbox';

export function GoalsLayerLabel({ children, active = false }) {
  return (
    <span className={`goals-layer-label ${active ? 'goals-layer-label--active' : ''}`}>
      {children}
    </span>
  );
}

export function GoalsSectionCard({
  id,
  title,
  hint,
  layer,
  active = false,
  editing,
  onEdit,
  onCancel,
  onSave,
  isEmpty,
  emptyTitle,
  emptyLead,
  emptyAction = 'Start',
  children,
  editChildren,
  className = '',
  extraActions = null,
}) {
  return (
    <section
      id={id}
      className={`goals-section-card ${active ? 'goals-section-card--active' : ''} ${className}`.trim()}
    >
      <header className="goals-section-card-header">
        <div className="goals-section-card-heading">
          {layer ? <GoalsLayerLabel active={active}>{layer}</GoalsLayerLabel> : null}
          <h2>{title}</h2>
          {hint ? <p>{hint}</p> : null}
        </div>
        <div className="goals-section-card-actions">
          {extraActions}
          {editing ? (
            <>
              <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm" onClick={onCancel}>Cancel</button>
              <button type="button" className="goals-btn goals-btn--primary goals-btn--sm" onClick={onSave}>Save</button>
            </>
          ) : (
            <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm" onClick={onEdit}>
              <Pencil size={14} aria-hidden />
              {isEmpty ? emptyAction : 'Edit'}
            </button>
          )}
        </div>
      </header>

      {isEmpty && !editing ? (
        <div className="goals-section-empty">
          <p className="goals-section-empty-title">{emptyTitle}</p>
          {emptyLead ? <p className="goals-section-empty-lead">{emptyLead}</p> : null}
        </div>
      ) : (
        <div className="goals-section-card-body">
          {editing ? editChildren : children}
        </div>
      )}
    </section>
  );
}

export function GoalsField({ label, hint, children, className = '' }) {
  return (
    <label className={`goals-field ${className}`.trim()}>
      <span className="goals-field-label">{label}</span>
      {hint ? <span className="goals-field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function GoalsInput(props) {
  return <input className="goals-input" {...props} />;
}

export function GoalsTextarea(props) {
  return <textarea className="goals-textarea" rows={4} {...props} />;
}

export function GoalsUncertainToggle({ checked, onChange, label = "I'm not sure yet — that's okay" }) {
  return (
    <VeridianCheckbox
      className="goals-uncertain-checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    >
      {label}
    </VeridianCheckbox>
  );
}

export function GoalsTagList({ tags }) {
  if (!tags?.length) return null;
  return (
    <div className="goals-tag-list">
      {tags.map((tag) => (
        <span key={tag} className="goals-tag">{tag}</span>
      ))}
    </div>
  );
}

export function GoalsTagEditor({ value, onChange, placeholder }) {
  const tags = Array.isArray(value) ? value : [];
  const [input, setInput] = useState('');

  const add = (raw) => {
    const next = raw.split(/[,]/).map((t) => t.trim()).filter(Boolean)
      .filter((t) => !tags.includes(t));
    if (next.length) onChange([...tags, ...next].slice(0, 8));
    setInput('');
  };

  return (
    <div className="goals-tag-editor">
      <div className="goals-tag-list">
        {tags.map((tag) => (
          <span key={tag} className="goals-tag goals-tag--editable">
            {tag}
            <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))} aria-label={`Remove ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <GoalsInput
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add(input);
          }
        }}
        onBlur={() => { if (input.trim()) add(input); }}
        placeholder={placeholder || 'Add priority area…'}
      />
    </div>
  );
}

export function GoalsRepeatableAdd({ onClick, label = 'Add another' }) {
  return (
    <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm goals-repeatable-add" onClick={onClick}>
      <Plus size={14} aria-hidden />
      {label}
    </button>
  );
}

export function GoalsRepeatableRemove({ onClick }) {
  return (
    <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm goals-repeatable-remove" onClick={onClick}>
      <X size={14} aria-hidden />
      Remove
    </button>
  );
}

export function GoalsOrderButtons({ onUp, onDown, disableUp, disableDown }) {
  return (
    <div className="goals-order-buttons">
      <button type="button" className="goals-icon-btn" onClick={onUp} disabled={disableUp} aria-label="Move up">
        <ChevronUp size={14} />
      </button>
      <button type="button" className="goals-icon-btn" onClick={onDown} disabled={disableDown} aria-label="Move down">
        <ChevronDown size={14} />
      </button>
    </div>
  );
}

export function GoalsBulletList({ items }) {
  if (!items?.length) return null;
  return (
    <ul className="goals-bullet-list">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}
