import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { FOCUS_PRESETS } from '@/lib/tools/tools-settings';

const PRESET_ORDER = ['deep', 'standard', 'sprint', 'custom'];

const PRESET_CHIP_LABELS = {
  deep: 'Deep 50/10',
  standard: 'Standard 25/5',
  sprint: 'Sprint 15/5',
  custom: 'Custom',
};

export default function FocusSetup({
  preset,
  customWorkMin,
  customBreakMin,
  onPresetChange,
  onCustomChange,
  onStart,
}) {
  const [goal, setGoal] = useState('');

  useEffect(() => {
    setGoal('');
  }, [preset]);

  const active = FOCUS_PRESETS[preset] || FOCUS_PRESETS.standard;
  const workMin = preset === 'custom' ? customWorkMin : active.workMin;
  const breakMin = preset === 'custom' ? customBreakMin : active.breakMin;

  const handleStart = () => {
    onStart({
      goal: goal.trim(),
      preset,
      workMin,
      breakMin,
    });
  };

  return (
    <div className="tools-focus-card tools-focus-card--setup">
      <div className="tools-focus-setup">
        <div className="tools-focus-setup-head">
          <h2>Focus session</h2>
          <p>Pick a rhythm, set a goal, and start.</p>
        </div>

        <div className="tools-focus-preset-row" role="group" aria-label="Focus presets">
          {PRESET_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              className={`tools-focus-preset-chip${preset === id ? ' active' : ''}`}
              onClick={() => onPresetChange(id)}
            >
              {PRESET_CHIP_LABELS[id]}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="tools-focus-custom-inputs">
            <label htmlFor="focusCustomWork">
              Work (min)
              <input
                id="focusCustomWork"
                type="number"
                min={1}
                max={180}
                step={1}
                value={customWorkMin}
                onChange={(e) => onCustomChange({ workMin: Number(e.target.value) })}
              />
            </label>
            <label htmlFor="focusCustomBreak">
              Break (min)
              <input
                id="focusCustomBreak"
                type="number"
                min={1}
                max={60}
                step={1}
                value={customBreakMin}
                onChange={(e) => onCustomChange({ breakMin: Number(e.target.value) })}
              />
            </label>
          </div>
        )}

        <label className="tools-focus-goal-field" htmlFor="focusSessionGoal">
          Session goal
          <input
            id="focusSessionGoal"
            type="text"
            placeholder="What will you finish in this block?"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={200}
          />
        </label>

        <div className="tools-focus-setup-meta">
          {workMin} min focus · {breakMin} min break
        </div>

        <button type="button" className="tools-focus-btn tools-focus-btn--primary" onClick={handleStart}>
          <Play size={14} />
          Start
        </button>
      </div>
    </div>
  );
}
