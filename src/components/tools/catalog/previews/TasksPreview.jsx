import { useState } from 'react';
import ToolsTabs from '@/components/tools/shared/ToolsTabs';
import { PREVIEW_TASKS } from '@/lib/tools/preview-fixtures';

export default function TasksPreview() {
  const [tab, setTab] = useState('active');
  const [tasks, setTasks] = useState(PREVIEW_TASKS);

  const toggle = (id) => {
    setTasks((prev) => prev.map((t) => (
      t.id === id ? { ...t, completed: !t.completed } : t
    )));
  };

  const visible = tab === 'completed'
    ? tasks.filter((t) => t.completed)
    : tasks.filter((t) => !t.completed);

  return (
    <div className="tools-preview-scale tools-preview-tasks">
      <div className="tools-agenda-shell tools-tasks-shell tools-preview-tasks-shell">
        <div className="tools-tasks-control-bar">
          <ToolsTabs
            tabs={[
              { id: 'active', label: 'Tasks' },
              { id: 'completed', label: 'Completed' },
            ]}
            active={tab}
            onChange={setTab}
            className="tools-agenda-tabs"
          />
          <div className="tools-tasks-control-filters">
            <span className="tools-preview-pill">Sort: Manual</span>
            <span className="tools-preview-pill">Filter: All</span>
          </div>
        </div>
        <div className="tools-agenda-list">
          {visible.map((task) => (
            <div
              key={task.id}
              className={`tools-agenda-item${task.completed ? ' completed' : ''}`}
            >
              <input
                type="checkbox"
                className="tools-agenda-check-input"
                checked={task.completed}
                onChange={() => toggle(task.id)}
                aria-label={`Toggle ${task.title}`}
              />
              <div className="tools-agenda-main">
                <div className="tools-agenda-title">{task.title}</div>
                <div className="tools-agenda-meta">{task.className}</div>
              </div>
              <span className={`tools-agenda-dot ${task.priority}`} />
            </div>
          ))}
        </div>
        <button type="button" className="tools-tasks-fab tools-preview-tasks-fab" tabIndex={-1}>
          Add Task
        </button>
      </div>
    </div>
  );
}
