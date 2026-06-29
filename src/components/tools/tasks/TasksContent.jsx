import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ToolsTabs from '@/components/tools/shared/ToolsTabs';
import TaskModal from '@/components/tools/tasks/TaskModal';
import { ToolsDropdown, ToolsDropdownCheckOption, ToolsDropdownOption } from '@/components/tools/shared/ToolsDropdown';
import { TASK_SORT_MODES } from '@/lib/tools/constants';
import {
  formatEstimatedMinutes,
  getActiveCategories,
  getCompletedExpiringSoon,
  getCompletedInWindow,
  isTaskOverdue,
  partitionActiveTasks,
  subtaskProgress,
} from '@/lib/tools/task-sort';
import { formatAgendaDateTime } from '@/lib/tools/time-format';
import { buildManualReorder } from '@/api/entities/toolsTasks';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';
import { taskFormToEventDraft } from '@/lib/tools/command-bar-draft';

const SORT_MODE_KEY = 'veridian.tasksSortMode';

function readSortMode() {
  try {
    const v = localStorage.getItem(SORT_MODE_KEY);
    return TASK_SORT_MODES.some((m) => m.id === v) ? v : 'manual';
  } catch {
    return 'manual';
  }
}

function writeSortMode(mode) {
  try {
    localStorage.setItem(SORT_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function TaskRow({
  task,
  onComplete,
  onEdit,
  onDelete,
  onToggleSubtask,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const [flashing, setFlashing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const overdue = isTaskOverdue(task);
  const dueDate = task.due ? new Date(task.due) : null;
  const dueString = dueDate ? formatAgendaDateTime(dueDate) : null;
  const estimate = formatEstimatedMinutes(task.estimatedMinutes);
  const progress = subtaskProgress(task.subtasks);
  const hasSubtasks = (task.subtasks || []).length > 0;
  const dotClass = task.priority === 'high' ? 'red' : task.priority === 'low' ? 'green' : 'yellow';

  const handleCheck = async (e) => {
    if (task.completed) {
      onComplete(task, false);
      return;
    }
    const subs = task.subtasks || [];
    const incomplete = subs.filter((s) => !s.completed);
    if (incomplete.length) {
      const ok = window.confirm('Mark all subtasks complete and finish this task?');
      if (!ok) {
        e.target.checked = false;
        return;
      }
      const allDone = subs.map((s) => ({ ...s, completed: true }));
      e.target.disabled = true;
      setFlashing(true);
      setTimeout(async () => {
        await onComplete(task, true, { subtasks: allDone });
        setFlashing(false);
      }, 520);
      return;
    }
    e.target.disabled = true;
    setFlashing(true);
    setTimeout(async () => {
      await onComplete(task, true);
      setFlashing(false);
    }, 520);
  };

  const handleSubtaskCheck = async (subId, checked) => {
    const next = (task.subtasks || []).map((s) =>
      (s.id === subId ? { ...s, completed: checked } : s));
    await onToggleSubtask(task, next);
    if (checked && next.length && next.every((s) => s.completed)) {
      setFlashing(true);
      setTimeout(async () => {
        await onComplete(task, true, { subtasks: next });
        setFlashing(false);
      }, 520);
    }
  };

  return (
    <div
      className={`tools-agenda-item${task.completed ? ' completed' : ''}${flashing ? ' tools-complete-flash' : ''}${draggable ? ' draggable' : ''}${overdue ? ' overdue' : ''}`}
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, task.taskId)}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop?.(e, task.taskId)}
      data-task-id={task.taskId}
    >
      <input
        type="checkbox"
        className="tools-agenda-check-input"
        checked={!!task.completed}
        onChange={handleCheck}
      />
      {hasSubtasks ? (
        <button
          type="button"
          className="tools-tasks-expand-btn"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <span className="tools-tasks-expand-spacer" />
      )}
      <div className="tools-agenda-main">
        <div className="tools-agenda-title-row">
          <span className="tools-agenda-title">{task.title}</span>
        </div>
        <div className="tools-agenda-meta tools-tasks-meta-row">
          {dueString ? (
            <span className={overdue ? 'tools-tasks-due-overdue' : ''}>{dueString}</span>
          ) : null}
          {estimate ? <span className="tools-tasks-tag">{estimate}</span> : null}
          {task.className ? <span className="tools-tasks-tag">{task.className}</span> : null}
          {progress ? (
            <span className="tools-tasks-subtask-progress">
              {progress.done}/{progress.total}
              <span className="tools-tasks-subtask-bar" aria-hidden="true">
                <span style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </span>
            </span>
          ) : null}
        </div>
        {expanded && hasSubtasks ? (
          <ul className="tools-tasks-subtask-list">
            {(task.subtasks || []).map((s) => (
              <li key={s.id}>
                <input
                  type="checkbox"
                  checked={!!s.completed}
                  onChange={(e) => handleSubtaskCheck(s.id, e.target.checked)}
                />
                <span className={s.completed ? 'done' : ''}>{s.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {task.type === 'task' ? (
        <span className={`tools-agenda-dot ${dotClass}`} aria-hidden="true" />
      ) : (
        <span className="tools-agenda-dot-spacer" aria-hidden="true" />
      )}
      <div className="tools-agenda-right">
        <button type="button" className="tools-agenda-icon-btn" title="Edit" onClick={() => onEdit(task)}>
          <Pencil size={14} />
        </button>
        <button type="button" className="tools-agenda-icon-btn" title="Delete" onClick={() => onDelete(task)}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function TaskSection({ title, titleClass, tasks, rowProps }) {
  if (!tasks.length) return null;
  return (
    <section className="tools-tasks-section">
      {title ? <h3 className={titleClass || 'tools-tasks-section-title'}>{title}</h3> : null}
      {tasks.map((task) => (
        <TaskRow key={task.taskId} task={task} {...rowProps} />
      ))}
    </section>
  );
}

export default function TasksContent({
  tasks,
  categories = [],
  createTask,
  updateTask,
  deleteTask,
  deleteRecurringFuture,
  reorderTasks,
  completeTask,
}) {
  const navigate = useNavigate();
  const { draft: commandDraft, clearDraft, action, clearAction } = useCommandBarDraft(['task', 'action']);
  const [tab, setTab] = useState('tasks');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [sortMode, setSortMode] = useState(readSortMode);
  const [categoryFilters, setCategoryFilters] = useState([]);

  useEffect(() => {
    if (commandDraft) {
      setEditing(null);
      setDialogOpen(true);
    }
  }, [commandDraft]);

  useEffect(() => {
    if (!action) return;
    if (action.actionId === 'completeTask') {
      const task = (tasks || []).find((t) => t.taskId === action.payload?.taskId);
      if (task) {
        void completeTask(task, true).then(() => {
          toast.success(`Completed: ${action.payload?.title || task.title}`);
        });
      }
      clearAction();
    }
    if (action.actionId === 'filterTasks') {
      const { priority, classTag } = action.payload || {};
      if (classTag) setCategoryFilters([classTag]);
      if (priority) changeSortMode('priority');
      clearAction();
    }
  }, [action, tasks, completeTask, clearAction]);

  const handleSwitchToEvent = (form) => {
    setDialogOpen(false);
    clearDraft();
    navigate('/tools/calendar', {
      state: { commandBar: { type: 'event', draft: taskFormToEventDraft(form) } },
    });
  };

  const completed = useMemo(() => getCompletedInWindow(tasks || []), [tasks]);
  const expiringSoon = useMemo(() => getCompletedExpiringSoon(tasks || []), [tasks]);
  const chipCategories = useMemo(() => {
    const fromTasks = getActiveCategories(tasks);
    const merged = new Set([...categories.filter(Boolean), ...fromTasks]);
    return [...merged].sort((a, b) => a.localeCompare(b));
  }, [tasks, categories]);

  const { overdue, regular } = useMemo(
    () => partitionActiveTasks(tasks, sortMode, categoryFilters),
    [tasks, sortMode, categoryFilters],
  );

  const toggleCategory = (cat) => {
    setCategoryFilters((prev) =>
      (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const changeSortMode = (mode) => {
    setSortMode(mode);
    writeSortMode(mode);
  };

  const handleComplete = async (task, complete, opts) => {
    await completeTask(task, complete, opts);
  };

  const handleToggleSubtask = async (task, subtasks) => {
    await updateTask(task.taskId, { subtasks });
  };

  const handleSave = async (data) => {
    if (editing) {
      await updateTask(editing.taskId, data);
    } else {
      await createTask({ ...data, type: 'task' });
    }
  };

  const handleDelete = async (task) => {
    await deleteTask(task.taskId);
  };

  const handleDeleteRecurring = async (task) => {
    if (deleteRecurringFuture) {
      await deleteRecurringFuture(task.taskId);
    } else {
      await deleteTask(task.taskId);
    }
  };

  const handleDragStart = (e, taskId) => {
    setDragId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetId, sectionTasks) => {
    e.preventDefault();
    if (!dragId || dragId === targetId || sortMode !== 'manual') return;
    const updates = buildManualReorder(sectionTasks, dragId, targetId);
    if (!updates) return;
    await reorderTasks(updates);
    setDragId(null);
  };

  const rowProps = {
    onComplete: handleComplete,
    onEdit: (t) => { setEditing(t); setDialogOpen(true); },
    onDelete: handleDelete,
    onToggleSubtask: handleToggleSubtask,
    onDragStart: (e, id) => handleDragStart(e, id),
    onDragEnd: () => setDragId(null),
    onDragOver: (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; },
  };

  const canDrag = sortMode === 'manual';

  return (
    <div className="tools-agenda-shell tools-tasks-shell">
      <div className="tools-tasks-control-bar">
        <ToolsTabs
          tabs={[
            { id: 'tasks', label: 'Tasks' },
            { id: 'completed', label: `Completed (${completed.length})` },
          ]}
          active={tab}
          onChange={setTab}
          className="tools-agenda-tabs"
        />
        {tab === 'tasks' ? (
          <div className="tools-tasks-control-filters">
            <ToolsDropdown
              label="Sort"
              valueLabel={TASK_SORT_MODES.find((m) => m.id === sortMode)?.label || 'Manual'}
            >
              {(close) => TASK_SORT_MODES.map((m) => (
                <ToolsDropdownOption
                  key={m.id}
                  active={sortMode === m.id}
                  onClick={() => { changeSortMode(m.id); close(); }}
                >
                  {m.label}
                </ToolsDropdownOption>
              ))}
            </ToolsDropdown>
            {chipCategories.length > 0 ? (
              <ToolsDropdown
                label="Filter"
                valueLabel={
                  categoryFilters.length
                    ? `${categoryFilters.length} selected`
                    : 'All'
                }
              >
                {() => (
                  <>
                    {categoryFilters.length > 0 ? (
                      <button
                        type="button"
                        className="tools-dropdown-clear"
                        onClick={() => setCategoryFilters([])}
                      >
                        Clear all
                      </button>
                    ) : null}
                    {chipCategories.map((cat) => (
                      <ToolsDropdownCheckOption
                        key={cat}
                        checked={categoryFilters.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      >
                        {cat}
                      </ToolsDropdownCheckOption>
                    ))}
                  </>
                )}
              </ToolsDropdown>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="tools-agenda-list">
        {tab === 'tasks' ? (
          !overdue.length && !regular.length ? (
            <div className="tools-empty-hint">No tasks yet</div>
          ) : (
            <>
              <TaskSection
                title={overdue.length ? `Overdue (${overdue.length})` : null}
                titleClass="tools-tasks-section-title overdue"
                tasks={overdue}
                rowProps={{
                  ...rowProps,
                  draggable: false,
                  onDrop: (e, id) => handleDrop(e, id, overdue),
                }}
              />
              <TaskSection
                tasks={regular}
                rowProps={{
                  ...rowProps,
                  draggable: canDrag,
                  onDrop: (e, id) => handleDrop(e, id, regular),
                }}
              />
            </>
          )
        ) : (
          <>
            {expiringSoon.length > 0 ? (
              <p className="tools-tasks-expiry-warning">
                {expiringSoon.length} task{expiringSoon.length === 1 ? '' : 's'} expire in the next 7 days
              </p>
            ) : null}
            {!completed.length ? (
              <div className="tools-empty-hint">No completed tasks in the last 30 days</div>
            ) : (
              completed.map((task) => (
                <TaskRow
                  key={task.taskId}
                  task={task}
                  {...rowProps}
                  draggable={false}
                  onDrop={() => {}}
                />
              ))
            )}
          </>
        )}
      </div>

      <button
        type="button"
        className="tools-tasks-fab"
        title="Add New Task"
        onClick={() => { setEditing(null); setDialogOpen(true); }}
      >
        <Plus size={22} />
        <span>Add Task</span>
      </button>

      <TaskModal
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) clearDraft();
        }}
        task={editing}
        initialDraft={!editing ? commandDraft : null}
        categories={categories}
        onSave={handleSave}
        onDelete={handleDelete}
        onDeleteRecurring={handleDeleteRecurring}
        onSwitchToEvent={!editing ? handleSwitchToEvent : undefined}
      />
    </div>
  );
}
