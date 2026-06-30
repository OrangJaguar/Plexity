import { useEffect, useRef, useState } from 'react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import { ESTIMATED_TIME_PRESETS } from '@/lib/tools/constants';

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'interval', label: 'Every X weeks' },
  { value: 'custom', label: 'Custom days' },
];

function emptyForm() {
  return {
    title: '',
    due: '',
    priority: 'medium',
    className: '',
    notes: '',
    estimatedMinutes: null,
    estimatedCustom: '',
    subtasks: [],
    recurrenceType: 'none',
    intervalWeeks: 1,
    repeatDays: [],
  };
}

function taskToForm(task) {
  if (!task) return emptyForm();
  const preset = ESTIMATED_TIME_PRESETS.includes(task.estimatedMinutes);
  return {
    title: task.title || '',
    due: task.due ? task.due.slice(0, 16) : '',
    priority: task.priority || 'medium',
    className: task.className || '',
    notes: task.notes || '',
    estimatedMinutes: preset ? task.estimatedMinutes : null,
    estimatedCustom: preset || task.estimatedMinutes == null
      ? ''
      : String(task.estimatedMinutes),
    subtasks: (task.subtasks || []).map((s) => ({ ...s })),
    recurrenceType: task.recurrenceRule?.type || 'none',
    intervalWeeks: task.recurrenceRule?.intervalWeeks || 1,
    repeatDays: task.recurrenceRule?.repeatDays || [],
  };
}

export default function TaskModal({
  open,
  onOpenChange,
  task,
  initialDraft,
  categories = [],
  onSave,
  onDelete,
  onDeleteRecurring,
  onSwitchToEvent,
}) {
  const [form, setForm] = useState(emptyForm);
  const [newSubtask, setNewSubtask] = useState('');
  const subtaskDragRef = useRef(null);
  const [subtaskOverId, setSubtaskOverId] = useState(null);

  useEffect(() => {
    if (open) setForm(taskToForm(task || initialDraft));
  }, [open, task, initialDraft]);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const moveSubtask = (fromIndex, toIndex) => {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    setForm((prev) => {
      const next = [...prev.subtasks];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return { ...prev, subtasks: next };
    });
  };

  const handleSubtaskGripDown = (e, subtaskId, index) => {
    if (e.button !== 0) return;
    e.preventDefault();
    subtaskDragRef.current = { subtaskId, index, startY: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleSubtaskGripMove = (e) => {
    const drag = subtaskDragRef.current;
    if (!drag) return;
    if (Math.abs(e.clientY - drag.startY) > 4) drag.moved = true;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const row = el?.closest?.('[data-subtask-id]');
    const overId = row?.getAttribute('data-subtask-id');
    if (overId) setSubtaskOverId(overId);
  };

  const handleSubtaskGripUp = (e) => {
    const drag = subtaskDragRef.current;
    if (!drag) return;
    if (drag.moved && subtaskOverId && subtaskOverId !== drag.subtaskId) {
      const from = form.subtasks.findIndex((s) => s.id === drag.subtaskId);
      const to = form.subtasks.findIndex((s) => s.id === subtaskOverId);
      moveSubtask(from, to);
    }
    subtaskDragRef.current = null;
    setSubtaskOverId(null);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const toggleRepeatDay = (dow) => {
    set({
      repeatDays: form.repeatDays.includes(dow)
        ? form.repeatDays.filter((d) => d !== dow)
        : [...form.repeatDays, dow],
    });
  };

  const addSubtask = () => {
    const title = newSubtask.trim();
    if (!title) return;
    set({
      subtasks: [
        ...form.subtasks,
        { id: crypto.randomUUID(), title, completed: false },
      ],
    });
    setNewSubtask('');
  };

  const removeSubtask = (id) => {
    set({ subtasks: form.subtasks.filter((s) => s.id !== id) });
  };

  const toggleSubtask = (id) => {
    set({
      subtasks: form.subtasks.map((s) =>
        (s.id === id ? { ...s, completed: !s.completed } : s)),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const customMins = parseInt(form.estimatedCustom, 10);
    const estimatedMinutes = form.estimatedMinutes
      ?? (Number.isFinite(customMins) && customMins > 0 ? customMins : null);
    const recurrenceRule = form.recurrenceType === 'none'
      ? null
      : {
        type: form.recurrenceType,
        intervalWeeks: form.intervalWeeks,
        repeatDays: form.repeatDays,
      };
    onSave({
      title: form.title.trim(),
      due: form.due,
      priority: form.priority,
      className: form.className,
      notes: form.notes,
      estimatedMinutes,
      subtasks: form.subtasks,
      recurrenceRule,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!task || !onDelete) return;
    const hasRecurrence = task.recurrenceRule?.type && task.recurrenceRule.type !== 'none';
    if (hasRecurrence && onDeleteRecurring) {
      const choice = window.confirm(
        'Delete this task only?\n\nOK = this occurrence only\nCancel = choose "all future" in the next prompt',
      );
      if (choice) {
        onDelete(task);
        onOpenChange(false);
        return;
      }
      const allFuture = window.confirm('Delete this and all future recurring instances?');
      if (allFuture) {
        onDeleteRecurring(task);
        onOpenChange(false);
      }
      return;
    }
    if (window.confirm('Delete this task?')) {
      onDelete(task);
      onOpenChange(false);
    }
  };

  return (
    <ToolsModal
      open={open}
      onOpenChange={onOpenChange}
      title={task ? 'Edit Task' : 'Add Task'}
      maxWidth="520px"
    >
      <form onSubmit={handleSubmit}>
        <div className="tools-modal-field">
          <label htmlFor="task-title">Title</label>
          <input
            id="task-title"
            type="text"
            value={form.title}
            onChange={(e) => set({ title: e.target.value })}
            required
            autoComplete="off"
          />
        </div>
        <div className="tools-tasks-modal-grid">
          <div className="tools-modal-field">
            <label htmlFor="task-due">Due date</label>
            <input
              id="task-due"
              type="datetime-local"
              value={form.due}
              onChange={(e) => set({ due: e.target.value })}
            />
          </div>
          <div className="tools-modal-field">
            <label htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              value={form.priority}
              onChange={(e) => set({ priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="tools-modal-field">
          <label htmlFor="task-class">Category</label>
          <select
            id="task-class"
            value={form.className}
            onChange={(e) => set({ className: e.target.value })}
          >
            <option value="">No category</option>
            {categories.filter(Boolean).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="tools-modal-field">
          <label>Estimated time</label>
          <div className="tools-tasks-estimate-row">
            {ESTIMATED_TIME_PRESETS.map((mins) => (
              <button
                key={mins}
                type="button"
                className={`tools-tasks-estimate-chip${form.estimatedMinutes === mins ? ' active' : ''}`}
                onClick={() => set({ estimatedMinutes: mins, estimatedCustom: '' })}
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
            <input
              type="number"
              min="1"
              placeholder="Custom"
              className="tools-tasks-estimate-custom"
              value={form.estimatedCustom}
              onChange={(e) => set({ estimatedCustom: e.target.value, estimatedMinutes: null })}
            />
          </div>
        </div>
        <div className="tools-modal-field">
          <label>Subtasks</label>
          <div className="tools-tasks-subtask-editor">
            {form.subtasks.map((s, index) => (
              <div
                key={s.id}
                data-subtask-id={s.id}
                className={`tools-tasks-subtask-editor-row${subtaskOverId === s.id ? ' is-drop-target' : ''}`}
              >
                <button
                  type="button"
                  className="tools-tasks-subtask-grip"
                  aria-label="Drag to reorder subtask"
                  onPointerDown={(e) => handleSubtaskGripDown(e, s.id, index)}
                  onPointerMove={handleSubtaskGripMove}
                  onPointerUp={handleSubtaskGripUp}
                  onPointerCancel={handleSubtaskGripUp}
                >
                  <GripVertical size={14} />
                </button>
                <input
                  type="checkbox"
                  checked={!!s.completed}
                  onChange={() => toggleSubtask(s.id)}
                />
                <span className={s.completed ? 'done' : ''} title={s.title}>{s.title}</span>
                <button type="button" className="tools-agenda-icon-btn" onClick={() => removeSubtask(s.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="tools-tasks-subtask-add-row">
              <input
                type="text"
                placeholder="Add subtask"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              />
              <button type="button" className="btn" onClick={addSubtask}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="tools-modal-field">
          <label htmlFor="task-notes">Notes</label>
          <textarea
            id="task-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </div>
        <div className="tools-modal-field">
          <label htmlFor="task-recurrence">Recurrence</label>
          <select
            id="task-recurrence"
            value={form.recurrenceType}
            onChange={(e) => set({ recurrenceType: e.target.value })}
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {form.recurrenceType === 'interval' && (
            <div className="tools-tasks-interval-row">
              <label htmlFor="task-interval">Every</label>
              <input
                id="task-interval"
                type="number"
                min="1"
                max="52"
                value={form.intervalWeeks}
                onChange={(e) => set({ intervalWeeks: parseInt(e.target.value, 10) || 1 })}
              />
              <span>week(s)</span>
            </div>
          )}
          {form.recurrenceType === 'custom' && (
            <div className="tools-calendar-repeat-days">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, dow) => (
                <button
                  key={dow}
                  type="button"
                  className={`tools-calendar-repeat-day-chip${form.repeatDays.includes(dow) ? ' active' : ''}`}
                  onClick={() => toggleRepeatDay(dow)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="tools-form-actions">
          {task ? (
            <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
          ) : onSwitchToEvent ? (
            <button
              type="button"
              className="tools-modal-switch-type"
              onClick={() => onSwitchToEvent(form)}
            >
              Switch to calendar event
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </div>
      </form>
    </ToolsModal>
  );
}
