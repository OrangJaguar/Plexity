import { useState } from 'react';
import AppCheckbox from '@/components/shared/form/AppCheckbox';
import {
  GoalsField,
  GoalsInput,
  GoalsTextarea,
} from '@/components/tools/goals/goals-shared';
import {
  ALIGNMENT_OPTIONS,
  PRIORITY_STATUS,
  newCheckIn,
  newWeeklyPriority,
  statusLabel,
} from '@/lib/tools/goals/goals-model';
import { formatWeekLabel } from '@/lib/tools/goals/goals-week';

const REFLECTION_FIELDS = [
  { key: 'movedForward', label: 'What moved forward?', hint: 'Even small progress counts.' },
  { key: 'slipped', label: 'What slipped or stalled?', hint: 'Honest, not judgmental.' },
  { key: 'blockers', label: 'What got in the way?', hint: 'Time, energy, dependencies, surprises.' },
  { key: 'nextWeekFocus', label: 'What matters most next week?', hint: 'A few words or one sentence.' },
];

const STATUS_OPTIONS = [
  PRIORITY_STATUS.COMPLETED,
  PRIORITY_STATUS.PARTIAL,
  PRIORITY_STATUS.DROPPED,
  PRIORITY_STATUS.NOT_DONE,
];

export default function GoalsWeeklyCheckin({
  doc,
  weekKey,
  onCancel,
  onComplete,
}) {
  const priorities = doc.weekly.priorities;
  const [step, setStep] = useState(1);
  const [reviews, setReviews] = useState(() => priorities.map((p) => ({
    priorityId: p.id,
    status: p.status === PRIORITY_STATUS.ACTIVE ? PRIORITY_STATUS.PARTIAL : p.status,
    note: '',
  })));
  const [reflection, setReflection] = useState({
    movedForward: '',
    slipped: '',
    blockers: '',
    nextWeekFocus: '',
    alignedWithSeason: '',
    alignmentNote: '',
  });
  const [carryIds, setCarryIds] = useState(() => priorities
    .filter((p) => p.status === PRIORITY_STATUS.ACTIVE || p.status === PRIORITY_STATUS.PARTIAL)
    .map((p) => p.id));
  const [newPriorityText, setNewPriorityText] = useState('');

  const updateReview = (idx, patch) => {
    setReviews((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const updateReflection = (key, value) => {
    setReflection((prev) => ({ ...prev, [key]: value }));
  };

  const finish = () => {
    const checkIn = newCheckIn(weekKey, {
      prioritiesReview: reviews,
      reflection,
    });

    const carried = priorities
      .filter((p) => carryIds.includes(p.id))
      .map((p) => newWeeklyPriority({
        text: p.text,
        source: 'carried',
        pillarId: p.pillarId,
        seasonArea: p.seasonArea,
      }));

    const extra = newPriorityText.trim()
      ? [newWeeklyPriority({ text: newPriorityText.trim(), source: 'manual' })]
      : [];

    onComplete({ checkIn, nextPriorities: [...carried, ...extra] });
  };

  return (
    <div className="goals-checkin-panel">
      <header className="goals-checkin-head">
        <div>
          <h3>Weekly check-in</h3>
          <p>{formatWeekLabel(weekKey)} · A short strategic review</p>
        </div>
        <span className="goals-checkin-step">Step {step} of 4</span>
      </header>

      {step === 1 && (
        <div className="goals-checkin-step-body">
          <p className="goals-checkin-lead">Review each priority from this week. Mark what actually happened.</p>
          <div className="goals-checkin-priorities">
            {priorities.map((p, idx) => (
              <div key={p.id} className="goals-checkin-priority-row">
                <p className="goals-checkin-priority-text">{p.text}</p>
                <div className="goals-checkin-status-group">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`goals-status-chip ${reviews[idx]?.status === status ? 'is-selected' : ''}`}
                      onClick={() => updateReview(idx, { status })}
                    >
                      {statusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="goals-checkin-step-body">
          {REFLECTION_FIELDS.map((field) => (
            <GoalsField key={field.key} label={field.label} hint={field.hint}>
              <GoalsTextarea
                rows={2}
                value={reflection[field.key]}
                onChange={(e) => updateReflection(field.key, e.target.value)}
              />
            </GoalsField>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="goals-checkin-step-body">
          <GoalsField
            label="Did this week align with your current season?"
            hint={doc.currentSeason.title ? `Season: ${doc.currentSeason.title}` : 'Define a season above to make this more useful.'}
          >
            <div className="goals-alignment-options">
              {ALIGNMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`goals-alignment-chip ${reflection.alignedWithSeason === opt.id ? 'is-selected' : ''}`}
                  onClick={() => updateReflection('alignedWithSeason', opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </GoalsField>
          <GoalsField label="Anything to note about alignment?" hint="Optional">
            <GoalsTextarea
              rows={2}
              value={reflection.alignmentNote}
              onChange={(e) => updateReflection('alignmentNote', e.target.value)}
            />
          </GoalsField>
        </div>
      )}

      {step === 4 && (
        <div className="goals-checkin-step-body">
          <p className="goals-checkin-lead">Carry still-relevant priorities into next week, or start fresh.</p>
          <div className="goals-checkin-carry-list">
            {priorities.map((p) => (
              <AppCheckbox
                key={p.id}
                className="goals-carry-item"
                checked={carryIds.includes(p.id)}
                onChange={(e) => {
                  setCarryIds((prev) => (
                    e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                  ));
                }}
              >
                {p.text}
              </AppCheckbox>
            ))}
          </div>
          <GoalsField label="Add a priority for next week" hint="Optional">
            <GoalsInput
              value={newPriorityText}
              onChange={(e) => setNewPriorityText(e.target.value)}
              placeholder="One meaningful focus for next week"
            />
          </GoalsField>
        </div>
      )}

      <footer className="goals-checkin-footer">
        <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm" onClick={onCancel}>
          Cancel
        </button>
        <div className="goals-checkin-footer-right">
          {step > 1 ? (
            <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : null}
          {step < 4 ? (
            <button type="button" className="goals-btn goals-btn--primary goals-btn--sm" onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          ) : (
            <button type="button" className="goals-btn goals-btn--primary goals-btn--sm" onClick={finish}>
              Complete check-in
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
