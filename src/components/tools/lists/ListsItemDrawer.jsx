import { useEffect, useState } from 'react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import { ListsStarRating } from '@/components/tools/lists/lists-shared';
import {
  duplicateItem,
  getListStatuses,
  getTemplate,
  getStatusLabel,
  parseTags,
} from '@/lib/tools/lists/lists-model';

function formatDateInput(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function parseDateInput(val) {
  if (!val) return null;
  const d = new Date(`${val}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function TemplateFields({ templateId, extra, onExtraChange }) {
  const tpl = getTemplate(templateId);
  if (templateId === 'movies') {
    return (
      <>
        <label className="lists-field">
          <span>Where to watch</span>
          <input value={extra.whereToWatch || ''} onChange={(e) => onExtraChange({ whereToWatch: e.target.value })} placeholder="Netflix, theater…" />
        </label>
        <label className="lists-field">
          <span>Genre</span>
          <input value={extra.genre || ''} onChange={(e) => onExtraChange({ genre: e.target.value })} placeholder="Sci-fi, drama…" />
        </label>
        <label className="lists-field">
          <span>Date watched</span>
          <input type="date" value={formatDateInput(extra.dateWatched)} onChange={(e) => onExtraChange({ dateWatched: parseDateInput(e.target.value) })} />
        </label>
      </>
    );
  }
  if (templateId === 'books') {
    return (
      <>
        <label className="lists-field">
          <span>Author</span>
          <input value={extra.author || ''} onChange={(e) => onExtraChange({ author: e.target.value })} />
        </label>
        <label className="lists-field">
          <span>Genre</span>
          <input value={extra.genre || ''} onChange={(e) => onExtraChange({ genre: e.target.value })} />
        </label>
        <div className="lists-field-row">
          <label className="lists-field">
            <span>Started</span>
            <input type="date" value={formatDateInput(extra.startDate)} onChange={(e) => onExtraChange({ startDate: parseDateInput(e.target.value) })} />
          </label>
          <label className="lists-field">
            <span>Finished</span>
            <input type="date" value={formatDateInput(extra.finishDate)} onChange={(e) => onExtraChange({ finishDate: parseDateInput(e.target.value) })} />
          </label>
        </div>
      </>
    );
  }
  if (templateId === 'restaurants') {
    return (
      <>
        <label className="lists-field">
          <span>Cuisine</span>
          <input value={extra.cuisine || ''} onChange={(e) => onExtraChange({ cuisine: e.target.value })} />
        </label>
        <div className="lists-field-row">
          <label className="lists-field">
            <span>Price level</span>
            <select value={extra.priceLevel || ''} onChange={(e) => onExtraChange({ priceLevel: e.target.value })}>
              <option value="">—</option>
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
              <option value="$$$$">$$$$</option>
            </select>
          </label>
          <label className="lists-field">
            <span>Date tried</span>
            <input type="date" value={formatDateInput(extra.dateTried)} onChange={(e) => onExtraChange({ dateTried: parseDateInput(e.target.value) })} />
          </label>
        </div>
        <label className="lists-field">
          <span>Location</span>
          <input value={extra.location || ''} onChange={(e) => onExtraChange({ location: e.target.value })} />
        </label>
        <label className="lists-field">
          <span>Best item / order</span>
          <input value={extra.bestItem || ''} onChange={(e) => onExtraChange({ bestItem: e.target.value })} />
        </label>
      </>
    );
  }
  if (templateId === 'foods') {
    return (
      <label className="lists-field">
        <span>Where found</span>
        <input value={extra.whereFound || ''} onChange={(e) => onExtraChange({ whereFound: e.target.value })} placeholder="Store, restaurant, city…" />
      </label>
    );
  }
  if (templateId === 'prompts') {
    return (
      <>
        <div className="lists-field-row">
          <label className="lists-field">
            <span>Category</span>
            <input value={extra.category || ''} onChange={(e) => onExtraChange({ category: e.target.value })} placeholder="Coding, essay…" />
          </label>
          <label className="lists-field">
            <span>Platform / model</span>
            <input value={extra.platform || ''} onChange={(e) => onExtraChange({ platform: e.target.value })} placeholder="Gemini, Claude…" />
          </label>
        </div>
        <label className="lists-field lists-field--prompt">
          <span>Prompt text</span>
          <textarea
            className="lists-prompt-textarea"
            rows={6}
            value={extra.promptText || ''}
            onChange={(e) => onExtraChange({ promptText: e.target.value })}
            placeholder="Paste or write the full prompt…"
          />
        </label>
        <label className="lists-field">
          <span>Result quality (1–5)</span>
          <ListsStarRating
            value={extra.resultRating ?? null}
            onChange={(n) => onExtraChange({ resultRating: n })}
          />
        </label>
      </>
    );
  }
  if (!tpl.extraFields.length) return null;
  return null;
}

export default function ListsItemDrawer({
  open,
  onOpenChange,
  item,
  list,
  allLists,
  onSave,
  onDelete,
  onDuplicate,
  onMove,
  onArchive,
}) {
  const [draft, setDraft] = useState(item);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open && item) setDraft(item);
  }, [open, item]);

  if (!item || !list || !draft) return null;

  const statuses = getListStatuses(list.templateId);
  const isPrompt = list.templateId === 'prompts';

  const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial, updatedAt: Date.now() }));
  const patchExtra = (partial) => setDraft((prev) => ({
    ...prev,
    extra: { ...prev.extra, ...partial },
    updatedAt: Date.now(),
  }));

  const addTags = () => {
    const next = parseTags(tagInput);
    if (!next.length) return;
    patch({ tags: [...new Set([...draft.tags, ...next])] });
    setTagInput('');
  };

  const save = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title={draft.title || 'Item'} maxWidth="560px" className="lists-item-drawer-modal">
      <div className="lists-item-drawer">
        <label className="lists-field">
          <span>Title</span>
          <input value={draft.title} onChange={(e) => patch({ title: e.target.value })} />
        </label>
        <label className="lists-field">
          <span>Subtitle</span>
          <input value={draft.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} placeholder="Short descriptor" />
        </label>

        <div className="lists-field-row">
          <label className="lists-field">
            <span>Status</span>
            <select value={draft.status} onChange={(e) => patch({ status: e.target.value })}>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="lists-field lists-field--rating">
            <span>Rating</span>
            <ListsStarRating value={draft.rating} onChange={(n) => patch({ rating: n })} />
          </label>
        </div>

        <label className="lists-field lists-field--checkbox">
          <input type="checkbox" checked={draft.isFavorite} onChange={(e) => patch({ isFavorite: e.target.checked })} />
          <span>Mark as favorite</span>
        </label>

        <TemplateFields templateId={list.templateId} extra={draft.extra || {}} onExtraChange={patchExtra} />

        <label className="lists-field">
          <span>Notes</span>
          <textarea rows={4} value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="What you thought, what to remember…" />
        </label>

        <label className="lists-field">
          <span>Link</span>
          <input type="url" value={draft.link} onChange={(e) => patch({ link: e.target.value })} placeholder="https://…" />
        </label>

        <label className="lists-field">
          <span>Tags</span>
          <div className="lists-tag-input-row">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTags(); } }}
              placeholder="Add tags, comma separated"
            />
            <button type="button" className="lists-btn lists-btn--ghost lists-btn--sm" onClick={addTags}>Add</button>
          </div>
          {draft.tags.length > 0 && (
            <div className="lists-tag-row">
              {draft.tags.map((t) => (
                <button key={t} type="button" className="lists-tag-chip" onClick={() => patch({ tags: draft.tags.filter((x) => x !== t) })}>
                  #{t} ×
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="lists-field-row">
          <label className="lists-field">
            <span>Target date</span>
            <input type="date" value={formatDateInput(draft.targetDate)} onChange={(e) => patch({ targetDate: parseDateInput(e.target.value) })} />
          </label>
          <label className="lists-field">
            <span>Completed date</span>
            <input type="date" value={formatDateInput(draft.completedDate)} onChange={(e) => patch({ completedDate: parseDateInput(e.target.value) })} />
          </label>
        </div>

        <p className="lists-item-meta">
          Added {new Date(draft.dateAdded).toLocaleDateString()} · Updated {new Date(draft.updatedAt).toLocaleDateString()}
          {draft.status && ` · ${getStatusLabel(list.templateId, draft.status)}`}
        </p>

        <div className="lists-drawer-actions">
          {isPrompt && draft.extra?.promptText && (
            <button type="button" className="lists-btn lists-btn--ghost" onClick={() => navigator.clipboard.writeText(draft.extra.promptText)}>
              Copy prompt
            </button>
          )}
          <button type="button" className="lists-btn lists-btn--ghost" onClick={() => onDuplicate(duplicateItem(draft))}>Duplicate</button>
          <button type="button" className="lists-btn lists-btn--ghost" onClick={() => onMove(draft)}>Move…</button>
          <button type="button" className="lists-btn lists-btn--ghost" onClick={() => onArchive(draft)}>Archive</button>
          <button type="button" className="lists-btn lists-btn--ghost lists-btn--danger" onClick={() => onDelete(draft.id)}>Delete</button>
          <span className="lists-drawer-actions-spacer" />
          <button type="button" className="lists-btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className="lists-btn lists-btn--primary" onClick={save}>Save</button>
        </div>
      </div>
    </ToolsModal>
  );
}
