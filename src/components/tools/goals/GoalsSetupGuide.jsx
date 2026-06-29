import { ArrowRight, Check } from 'lucide-react';
import { SETUP_STEPS, computeSetupProgress } from '@/lib/tools/goals/goals-model';

export default function GoalsSetupGuide({ doc, onGoToStep, onDismiss }) {
  const { done, total, checks } = computeSetupProgress(doc);
  const stepIndex = Math.min(doc.setupStep || 0, SETUP_STEPS.length - 1);
  const current = SETUP_STEPS[stepIndex];

  if (doc.setupComplete) return null;

  return (
    <aside className="goals-setup-guide">
      <div className="goals-setup-guide-head">
        <div>
          <h2>Getting oriented</h2>
          <p>Start broad, get practical. Skip anything you are not ready to define.</p>
        </div>
        <div className="goals-setup-progress" aria-label={`${done} of ${total} sections started`}>
          <span>{done}/{total}</span>
          <div className="goals-setup-progress-bar">
            <span style={{ width: `${(done / total) * 100}%` }} />
          </div>
        </div>
      </div>

      <ol className="goals-setup-steps">
        {SETUP_STEPS.map((step, idx) => {
          const complete = checks[idx];
          const isCurrent = idx === stepIndex;
          return (
            <li key={step.id} className={`goals-setup-step ${isCurrent ? 'is-current' : ''} ${complete ? 'is-done' : ''}`}>
              <span className="goals-setup-step-num">
                {complete ? <Check size={12} /> : idx + 1}
              </span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.hint}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="goals-setup-guide-actions">
        <button type="button" className="goals-btn goals-btn--primary goals-btn--sm" onClick={() => onGoToStep(current.id)}>
          Continue: {current.label}
          <ArrowRight size={14} aria-hidden />
        </button>
        <button type="button" className="goals-btn goals-btn--ghost goals-btn--sm" onClick={onDismiss}>
          I'll explore on my own
        </button>
      </div>
    </aside>
  );
}
