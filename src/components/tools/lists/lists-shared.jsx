import {
  Apple, BookOpen, Copy, Film, Folder, Lightbulb, MapPin, Newspaper, Sparkles, Star, Utensils,
} from 'lucide-react';
import { getStatusLabel } from '@/lib/tools/lists/lists-model';

const TOPIC_ICONS = {
  film: Film,
  book: BookOpen,
  utensils: Utensils,
  apple: Apple,
  sparkles: Sparkles,
  lightbulb: Lightbulb,
  'map-pin': MapPin,
  newspaper: Newspaper,
  folder: Folder,
};

export function ListsTopicIcon({ icon, size = 16, className = '' }) {
  const Icon = TOPIC_ICONS[icon] || Folder;
  return <Icon size={size} className={className} aria-hidden />;
}

export function ListsStarRating({ value, onChange, size = 14, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className={`lists-star-rating${readOnly ? ' lists-star-rating--readonly' : ''}`} role={readOnly ? 'img' : 'group'} aria-label={value ? `${value} of 5 stars` : 'No rating'}>
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          className={`lists-star-btn${value != null && n <= value ? ' is-filled' : ''}`}
          onClick={() => !readOnly && onChange?.(value === n ? null : n)}
          tabIndex={readOnly ? -1 : 0}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={readOnly}
        >
          <Star size={size} fill={value != null && n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export function ListsStatusBadge({ templateId, statusId }) {
  return (
    <span className="lists-status-badge">
      {getStatusLabel(templateId, statusId)}
    </span>
  );
}

export function ListsTagChip({ tag, onRemove }) {
  return (
    <span className="lists-tag-chip">
      #{tag}
      {onRemove && (
        <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove tag ${tag}`}>×</button>
      )}
    </span>
  );
}

export function ListsCopyButton({ text, label = 'Copy' }) {
  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };
  return (
    <button type="button" className="lists-btn lists-btn--ghost lists-btn--sm" onClick={copy}>
      <Copy size={14} />
      {label}
    </button>
  );
}

export function ListsEmptyBlock({ title, lead, action }) {
  return (
    <div className="lists-empty-block">
      <h3>{title}</h3>
      {lead && <p>{lead}</p>}
      {action}
    </div>
  );
}
