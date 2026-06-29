import { useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';

export function ProfileSectionCard({
  title,
  hint,
  editing,
  onEdit,
  onCancel,
  onSave,
  isEmpty,
  emptyTitle,
  emptyLead,
  emptyAction = 'Add',
  children,
  editChildren,
  className = '',
}) {
  return (
    <section className={`profile-section-card ${className}`.trim()}>
      <header className="profile-section-card-header">
        <div className="profile-section-card-heading">
          <h2>{title}</h2>
          {hint ? <p>{hint}</p> : null}
        </div>
        <div className="profile-section-card-actions">
          {editing ? (
            <>
              <button type="button" className="profile-btn profile-btn--ghost profile-btn--sm" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="profile-btn profile-btn--primary profile-btn--sm" onClick={onSave}>
                Save
              </button>
            </>
          ) : (
            <button
              type="button"
              className="profile-btn profile-btn--ghost profile-btn--sm"
              onClick={onEdit}
              aria-label={`Edit ${title}`}
            >
              <Pencil size={14} aria-hidden />
              {isEmpty ? emptyAction : 'Edit'}
            </button>
          )}
        </div>
      </header>

      {isEmpty && !editing ? (
        <div className="profile-section-empty">
          <p className="profile-section-empty-title">{emptyTitle}</p>
          {emptyLead ? <p className="profile-section-empty-lead">{emptyLead}</p> : null}
        </div>
      ) : (
        <div className="profile-section-card-body">
          {editing ? editChildren : children}
        </div>
      )}
    </section>
  );
}

export function ProfileField({ label, hint, children, className = '' }) {
  return (
    <label className={`profile-field ${className}`.trim()}>
      <span className="profile-field-label">{label}</span>
      {hint ? <span className="profile-field-hint">{hint}</span> : null}
      {children}
    </label>
  );
}

export function ProfileInput(props) {
  return <input className="profile-input" {...props} />;
}

export function ProfileTextarea(props) {
  return <textarea className="profile-textarea" rows={4} {...props} />;
}

export function ProfileTagList({ tags, emptyLabel = 'None yet' }) {
  if (!tags?.length) {
    return <p className="profile-muted">{emptyLabel}</p>;
  }
  return (
    <div className="profile-tag-list">
      {tags.map((tag) => (
        <span key={tag} className="profile-tag">{tag}</span>
      ))}
    </div>
  );
}

export function ProfileTagEditor({ value, onChange, placeholder }) {
  const tags = Array.isArray(value) ? value : [];
  const [input, setInput] = useState('');

  const addFromInput = (raw) => {
    const next = raw
      .split(/[,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .filter((t) => !tags.includes(t));
    if (next.length) onChange([...tags, ...next].slice(0, 24));
    setInput('');
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  return (
    <div className="profile-tag-editor">
      <div className="profile-tag-list">
        {tags.map((tag) => (
          <span key={tag} className="profile-tag profile-tag--editable">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <input
        className="profile-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addFromInput(input);
          }
          if (e.key === 'Backspace' && !input && tags.length) {
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={() => { if (input.trim()) addFromInput(input); }}
        placeholder={placeholder || 'Type and press Enter…'}
      />
    </div>
  );
}
export function ProfileInfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="profile-info-row">
      <span className="profile-info-row-label">{label}</span>
      <span className="profile-info-row-value">{value}</span>
    </div>
  );
}

export function ProfileRepeatableActions({ onAdd, addLabel = 'Add another' }) {
  return (
    <button type="button" className="profile-btn profile-btn--ghost profile-btn--sm profile-repeatable-add" onClick={onAdd}>
      <Plus size={14} aria-hidden />
      {addLabel}
    </button>
  );
}

export function ProfileRepeatableRemove({ onClick, label = 'Remove' }) {
  return (
    <button type="button" className="profile-btn profile-btn--ghost profile-btn--sm profile-repeatable-remove" onClick={onClick}>
      <X size={14} aria-hidden />
      {label}
    </button>
  );
}

export function ProfileExternalLink({ href, children }) {
  if (!href) return children;
  const url = href.startsWith('http') ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="profile-external-link">
      {children}
    </a>
  );
}
