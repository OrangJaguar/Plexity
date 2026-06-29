import { formatFocusDuration } from '@/components/tools/focus/focus-time';

export default function FocusSummary({
  elapsedSeconds,
  cyclesCompleted,
  pauseCount,
  goal,
  goalAchieved,
  sessionsToday,
  onGoalAchievedChange,
  onDone,
}) {
  return (
    <div className="tools-focus-card tools-focus-card--summary">
      <div className="tools-focus-summary">
        <div className="tools-focus-summary-head">
          <h2>Session complete</h2>
          <p>Nice work staying in the zone.</p>
        </div>

        <div className="tools-focus-summary-grid">
          <div className="tools-focus-summary-stat">
            <span className="label">Elapsed</span>
            <strong>{formatFocusDuration(elapsedSeconds)}</strong>
          </div>
          <div className="tools-focus-summary-stat">
            <span className="label">Cycles</span>
            <strong>{cyclesCompleted}</strong>
          </div>
          <div className="tools-focus-summary-stat">
            <span className="label">Pauses</span>
            <strong>{pauseCount}</strong>
          </div>
          <div className="tools-focus-summary-stat">
            <span className="label">Sessions today</span>
            <strong>{sessionsToday}</strong>
          </div>
        </div>

        {goal ? (
          <div className="tools-focus-goal-review">
            <div className="tools-focus-goal-review-text">
              <span className="label">Goal</span>
              <p>{goal}</p>
            </div>
            <div className="tools-focus-goal-toggle" role="group" aria-label="Goal achieved">
              <button
                type="button"
                className={`tools-focus-preset-chip${goalAchieved === true ? ' active' : ''}`}
                onClick={() => onGoalAchievedChange(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={`tools-focus-preset-chip${goalAchieved === false ? ' active' : ''}`}
                onClick={() => onGoalAchievedChange(false)}
              >
                No
              </button>
            </div>
          </div>
        ) : null}

        <button type="button" className="tools-focus-btn tools-focus-btn--primary" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
