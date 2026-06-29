import { Play } from 'lucide-react';

const PRESETS = ['Deep 50/10', 'Standard 25/5', 'Sprint 15/5', 'Custom'];

export default function FocusPreview() {
  return (
    <div className="tools-preview-scale tools-preview-focus">
      <div className="tools-focus-shell tools-preview-focus-shell">
        <div className="tools-focus-layout tools-preview-focus-layout">
          <div className="tools-focus-center-stage">
            <div className="tools-focus-card tools-focus-card--setup tools-preview-focus-card">
              <div className="tools-focus-setup">
                <div className="tools-focus-setup-head">
                  <h2>Focus session</h2>
                  <p>Pick a rhythm, set a goal, and start.</p>
                </div>
                <div className="tools-focus-preset-row">
                  {PRESETS.map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      className={`tools-focus-preset-chip${i === 1 ? ' active' : ''}`}
                      tabIndex={-1}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="tools-focus-goal-field">
                  Session goal
                  <input
                    type="text"
                    readOnly
                    tabIndex={-1}
                    placeholder="What will you finish in this block?"
                    defaultValue="Finish problem set 7"
                  />
                </label>
                <div className="tools-focus-setup-meta">25 min focus · 5 min break</div>
                <button type="button" className="tools-focus-btn tools-focus-btn--primary" tabIndex={-1}>
                  <Play size={14} />
                  Start
                </button>
              </div>
            </div>
          </div>
          <aside className="tools-focus-context-panel tools-preview-focus-context">
            <div className="tools-focus-context-section">
              <div className="tools-focus-context-label">Pinned task</div>
              <div className="tools-focus-pinned-task">
                <input type="checkbox" className="tools-agenda-check-input" readOnly tabIndex={-1} />
                <div className="tools-focus-pinned-task-main">
                  <div className="tools-focus-pinned-task-title">Problem set 7</div>
                  <div className="tools-focus-pinned-task-meta">Math · due today</div>
                </div>
              </div>
            </div>
            <div className="tools-focus-context-section">
              <div className="tools-focus-context-label">Today&apos;s queue</div>
              <div className="tools-focus-study-row">
                <span>Read chapter 4</span>
                <span className="tools-focus-study-row-meta">English</span>
              </div>
              <div className="tools-focus-study-row">
                <span>Study group</span>
                <span className="tools-focus-study-row-meta">3:00 PM</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
