import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getDebriefItemsForToday, formatDebriefItemTime } from '@/lib/tools/debrief';

export default function FocusContextPanel({
  tasks,
  events,
  pinnedTaskId,
  onPinTask,
  onToggleTask,
}) {
  const [expanded, setExpanded] = useState(false);

  const debriefItems = useMemo(
    () => getDebriefItemsForToday(events, tasks),
    [events, tasks],
  );

  const pinnedTask = useMemo(() => {
    if (pinnedTaskId) {
      const match = (tasks || []).find((t) => t.taskId === pinnedTaskId && !t.completed);
      if (match) return match;
    }
    return (tasks || []).find((t) => !t.completed && t.due) || (tasks || []).find((t) => !t.completed) || null;
  }, [tasks, pinnedTaskId]);

  const handlePinnedCheck = async (e) => {
    if (!pinnedTask) return;
    const completed = e.target.checked;
    await onToggleTask(pinnedTask, completed);
  };

  return (
    <aside className="tools-focus-context-panel">
      <div className="tools-focus-context-section">
        <div className="tools-focus-context-label">Pinned task</div>
        {!pinnedTask ? (
          <div className="tools-focus-context-empty">No open tasks. Pick a clear target below.</div>
        ) : (
          <div className="tools-focus-pinned-task">
            <input
              type="checkbox"
              className="tools-agenda-check-input"
              checked={!!pinnedTask.completed}
              onChange={handlePinnedCheck}
            />
            <div className="tools-focus-pinned-task-main">
              <div className="tools-focus-pinned-task-title">{pinnedTask.title || 'Untitled task'}</div>
              {pinnedTask.className ? (
                <div className="tools-focus-pinned-task-meta">{pinnedTask.className}</div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <div className="tools-focus-context-section">
        <button
          type="button"
          className="tools-focus-context-expand"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span>Today&apos;s tasks & events</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="tools-focus-context-list">
            {!debriefItems.length ? (
              <div className="tools-focus-context-empty">Nothing scheduled for today.</div>
            ) : (
              debriefItems.map((it, i) => {
                const taskMatch = it.kind === 'task'
                  ? (tasks || []).find((t) => t.title === it.title && !t.completed)
                  : null;
                return (
                  <button
                    key={`${it.kind}-${it.title}-${i}`}
                    type="button"
                    className={`tools-focus-context-item${taskMatch?.taskId === pinnedTask?.taskId ? ' pinned' : ''}`}
                    onClick={() => {
                      if (taskMatch) onPinTask(taskMatch.taskId);
                    }}
                  >
                    <div>{it.title}</div>
                    <div className="meta">
                      {it.kind.toUpperCase()} · {formatDebriefItemTime(it)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
