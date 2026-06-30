import { useEffect, useState } from 'react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import {
  LIST_TEMPLATES,
  newList,
  newTopic,
  suggestTemplate,
  topicTemplateHint,
} from '@/lib/tools/lists/lists-model';
import { ListsTopicIcon, TOPIC_ICON_OPTIONS } from '@/components/tools/lists/lists-shared';

function suggestIconForTopicName(name) {
  const lower = name.trim().toLowerCase();
  const match = TOPIC_ICON_OPTIONS.find((opt) => lower.includes(opt.id.replace('-', ' '))
    || lower.includes(opt.label.toLowerCase().split(' ')[0]));
  if (match) return match.id;
  if (/\b(movie|film)\b/i.test(name)) return 'film';
  if (/\b(book|read)\b/i.test(name)) return 'book';
  if (/\b(restaurant|dining)\b/i.test(name)) return 'utensils';
  if (/\b(food|snack)\b/i.test(name)) return 'apple';
  if (/\b(prompt)\b/i.test(name)) return 'sparkles';
  if (/\b(idea)\b/i.test(name)) return 'lightbulb';
  if (/\b(place|travel)\b/i.test(name)) return 'map-pin';
  if (/\b(article|news)\b/i.test(name)) return 'newspaper';
  return 'folder';
}

export function CreateTopicModal({ open, onOpenChange, onCreate }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('folder');

  useEffect(() => {
    if (open) {
      setName('');
      setIcon('folder');
    }
  }, [open]);

  useEffect(() => {
    if (!open || !name.trim()) return;
    setIcon(suggestIconForTopicName(name));
  }, [name, open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(newTopic(trimmed, { icon }));
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title="New topic" maxWidth="420px">
      <label className="lists-field">
        <span>Topic name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Movies, Ideas, Tools…" onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </label>
      <div className="lists-field">
        <span className="lists-field-label">Icon</span>
        <div className="lists-icon-picker" role="group" aria-label="Topic icon">
          {TOPIC_ICON_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`lists-icon-picker-btn${icon === opt.id ? ' is-active' : ''}`}
              onClick={() => setIcon(opt.id)}
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={icon === opt.id}
            >
              <ListsTopicIcon icon={opt.id} size={18} />
            </button>
          ))}
        </div>
      </div>
      <p className="lists-modal-hint">Topics are broad domains — Movies, Books, Prompts, Places, and anything else you collect.</p>
      <div className="lists-modal-actions">
        <button type="button" className="lists-btn" onClick={() => onOpenChange(false)}>Cancel</button>
        <button type="button" className="lists-btn lists-btn--primary" onClick={submit}>Create topic</button>
      </div>
    </ToolsModal>
  );
}

export function CreateListModal({ open, onOpenChange, topic, onCreate }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateId, setTemplateId] = useState('custom');

  useEffect(() => {
    if (!open || !topic) return;
    setTitle('');
    setDescription('');
    const suggested = topicTemplateHint(topic.name);
    setTemplateId(suggested !== 'custom' ? suggested : 'custom');
    setUseTemplate(suggested !== 'custom');
  }, [open, topic]);

  useEffect(() => {
    if (!open || !topic) return;
    const suggested = suggestTemplate({ topicName: topic.name, listTitle: title });
    if (suggested !== 'custom') {
      setTemplateId(suggested);
      setUseTemplate(true);
    }
  }, [title, topic, open]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || !topic) return;
    const finalTemplate = useTemplate ? templateId : 'custom';
    onCreate(newList(topic.id, trimmed, { description: description.trim(), templateId: finalTemplate }));
    onOpenChange(false);
  };

  const tpl = LIST_TEMPLATES[templateId] || LIST_TEMPLATES.custom;

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title="New list" maxWidth="480px">
      <label className="lists-field">
        <span>List title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Watchlist, Restaurants to try…" />
      </label>
      <label className="lists-field">
        <span>Description (optional)</span>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this collection is for" />
      </label>

      <div className="lists-template-choice">
        <button
          type="button"
          className={`lists-template-option${useTemplate ? ' is-active' : ''}`}
          onClick={() => setUseTemplate(true)}
        >
          <strong>Use recommended template</strong>
          <span>Includes useful default fields and statuses for this kind of list.</span>
        </button>
        <button
          type="button"
          className={`lists-template-option${!useTemplate ? ' is-active' : ''}`}
          onClick={() => setUseTemplate(false)}
        >
          <strong>Start custom</strong>
          <span>Core fields only — title, notes, tags, status, dates, and rating.</span>
        </button>
      </div>

      {useTemplate && (
        <div className="lists-template-pick">
          <span className="lists-field-label">Template</span>
          <div className="lists-template-chips">
            {Object.values(LIST_TEMPLATES).filter((t) => t.id !== 'custom').map((t) => (
              <button
                key={t.id}
                type="button"
                className={`lists-template-chip${templateId === t.id ? ' is-active' : ''}`}
                onClick={() => setTemplateId(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="lists-modal-hint">{tpl.description}</p>
        </div>
      )}

      <div className="lists-modal-actions">
        <button type="button" className="lists-btn" onClick={() => onOpenChange(false)}>Cancel</button>
        <button type="button" className="lists-btn lists-btn--primary" onClick={submit}>Create list</button>
      </div>
    </ToolsModal>
  );
}

export function MoveItemModal({ open, onOpenChange, item, lists, topics, currentListId, onMove }) {
  const [targetListId, setTargetListId] = useState('');

  useEffect(() => {
    if (open) setTargetListId('');
  }, [open]);

  const options = lists.filter((l) => l.id !== currentListId);

  const submit = () => {
    if (!targetListId || !item) return;
    onMove(item.id, targetListId);
    onOpenChange(false);
  };

  const topicName = (listId) => {
    const list = lists.find((l) => l.id === listId);
    const topic = topics.find((t) => t.id === list?.topicId);
    return topic ? `${topic.name} · ${list.title}` : list?.title;
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title="Move item" maxWidth="420px">
      <p className="lists-modal-hint">Move &ldquo;{item?.title}&rdquo; to another list.</p>
      <label className="lists-field">
        <span>Destination list</span>
        <select value={targetListId} onChange={(e) => setTargetListId(e.target.value)}>
          <option value="">Choose a list…</option>
          {options.map((l) => (
            <option key={l.id} value={l.id}>{topicName(l.id)}</option>
          ))}
        </select>
      </label>
      <div className="lists-modal-actions">
        <button type="button" className="lists-btn" onClick={() => onOpenChange(false)}>Cancel</button>
        <button type="button" className="lists-btn lists-btn--primary" disabled={!targetListId} onClick={submit}>Move</button>
      </div>
    </ToolsModal>
  );
}
