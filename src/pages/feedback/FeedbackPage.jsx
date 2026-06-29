import { useMemo, useState } from 'react';
import { Bug, Lightbulb, MessageSquare, Copy, Check } from 'lucide-react';
import LoginPrompt from '@/components/stubs/LoginPrompt';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useSubmitFeedback } from '@/hooks/mutations/useSubmitFeedback';
import {
  BUG_SEVERITIES,
  FEEDBACK_SUPPORT_EMAIL,
  FEEDBACK_TYPES,
} from '@/lib/feedback/constants';
import { buildFeedbackPayload, validateFeedbackForm } from '@/lib/feedback/validate-feedback';
import { TOOL_REGISTRY } from '@/lib/tools/registry';

const TYPE_ICONS = {
  bug: Bug,
  feature: Lightbulb,
  general: MessageSquare,
};

const STEPS = ['Type', 'Details', 'Review', 'Done'];

const EMPTY_FORM = {
  type: '',
  subject: '',
  message: '',
  displayName: '',
  toolId: '',
  severity: 'medium',
  stepsToReproduce: '',
  expectedBehavior: '',
  actualBehavior: '',
};

export default function FeedbackPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const submitMutation = useSubmitFeedback();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldError, setFieldError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [copied, setCopied] = useState(false);

  usePageMeta({
    title: 'Feedback',
    description: 'Send bug reports, feature requests, or general feedback about Plexity.',
    canonicalPath: '/feedback',
  });

  const selectedType = useMemo(
    () => FEEDBACK_TYPES.find((t) => t.id === form.type),
    [form.type],
  );

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <LoginPrompt action="send feedback" />;
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldError('');
  }

  function handleTypeSelect(typeId) {
    updateField('type', typeId);
    setStep(1);
  }

  function handleDetailsNext(e) {
    e.preventDefault();
    const result = validateFeedbackForm(form);
    if (!result.ok) {
      setFieldError(result.message);
      return;
    }
    setStep(2);
  }

  async function handleSubmit() {
    const result = validateFeedbackForm(form);
    if (!result.ok) {
      setFieldError(result.message);
      setStep(1);
      return;
    }
    try {
      const payload = buildFeedbackPayload({
        ...form,
        displayName: form.displayName || user?.full_name || user?.email || '',
      });
      const res = await submitMutation.mutateAsync(payload);
      setRequestId(res.requestId || '');
      setStep(3);
    } catch (err) {
      setFieldError(err?.message || 'Could not submit feedback. Try again.');
    }
  }

  async function copyRequestId() {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="feedback-page">
      <div className="feedback-page-inner">
        <header className="feedback-page-header">
          <p className="feedback-page-eyebrow">Help improve Plexity</p>
          <h1>Send feedback</h1>
          <p className="feedback-page-lead">
            Bug reports, ideas, or anything else — signed-in submissions help prevent spam.
            Questions? Email{' '}
            <a href={`mailto:${FEEDBACK_SUPPORT_EMAIL}`}>{FEEDBACK_SUPPORT_EMAIL}</a>.
          </p>
        </header>

        <ol className="feedback-steps" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`feedback-step${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}
            >
              <span className="feedback-step-num">{i + 1}</span>
              <span className="feedback-step-label">{label}</span>
            </li>
          ))}
        </ol>

        {fieldError && (
          <div className="feedback-error" role="alert">{fieldError}</div>
        )}

        {step === 0 && (
          <section className="feedback-type-grid" aria-label="Choose feedback type">
            {FEEDBACK_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type.id];
              return (
                <button
                  key={type.id}
                  type="button"
                  className={`feedback-type-card${form.type === type.id ? ' is-selected' : ''}`}
                  onClick={() => handleTypeSelect(type.id)}
                >
                  <span className="feedback-type-icon" aria-hidden>
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <span className="feedback-type-label">{type.label}</span>
                  <span className="feedback-type-desc">{type.description}</span>
                </button>
              );
            })}
          </section>
        )}

        {step === 1 && (
          <form className="feedback-form" onSubmit={handleDetailsNext}>
            <div className="feedback-form-row">
              <label className="feedback-field">
                <span>Subject</span>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => updateField('subject', e.target.value)}
                  placeholder="Short summary"
                  maxLength={200}
                  required
                />
              </label>
              <label className="feedback-field">
                <span>Related tool (optional)</span>
                <select
                  value={form.toolId}
                  onChange={(e) => updateField('toolId', e.target.value)}
                >
                  <option value="">Not tool-specific</option>
                  {TOOL_REGISTRY.map((tool) => (
                    <option key={tool.id} value={tool.id}>{tool.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {form.type === 'bug' && (
              <label className="feedback-field">
                <span>Severity</span>
                <select
                  value={form.severity}
                  onChange={(e) => updateField('severity', e.target.value)}
                >
                  {BUG_SEVERITIES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="feedback-field">
              <span>Message</span>
              <textarea
                value={form.message}
                onChange={(e) => updateField('message', e.target.value)}
                rows={5}
                placeholder="Tell us what happened or what you'd like to see"
                required
              />
            </label>

            {form.type === 'bug' && (
              <>
                <label className="feedback-field">
                  <span>Steps to reproduce</span>
                  <textarea
                    value={form.stepsToReproduce}
                    onChange={(e) => updateField('stepsToReproduce', e.target.value)}
                    rows={3}
                    placeholder="1. Open… 2. Click…"
                  />
                </label>
                <div className="feedback-form-row">
                  <label className="feedback-field">
                    <span>Expected behavior</span>
                    <textarea
                      value={form.expectedBehavior}
                      onChange={(e) => updateField('expectedBehavior', e.target.value)}
                      rows={3}
                    />
                  </label>
                  <label className="feedback-field">
                    <span>Actual behavior</span>
                    <textarea
                      value={form.actualBehavior}
                      onChange={(e) => updateField('actualBehavior', e.target.value)}
                      rows={3}
                    />
                  </label>
                </div>
              </>
            )}

            <div className="feedback-form-actions">
              <button type="button" className="btn" onClick={() => setStep(0)}>Back</button>
              <button type="submit" className="btn btn-primary">Continue</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <section className="feedback-review">
            <h2>Review</h2>
            <dl className="feedback-review-list">
              <div><dt>Type</dt><dd>{selectedType?.label}</dd></div>
              <div><dt>Subject</dt><dd>{form.subject}</dd></div>
              {form.toolId && (
                <div>
                  <dt>Tool</dt>
                  <dd>{TOOL_REGISTRY.find((t) => t.id === form.toolId)?.label || form.toolId}</dd>
                </div>
              )}
              {form.type === 'bug' && (
                <div><dt>Severity</dt><dd className="feedback-review-cap">{form.severity}</dd></div>
              )}
              <div><dt>Message</dt><dd className="feedback-review-block">{form.message}</dd></div>
              {form.type === 'bug' && form.stepsToReproduce && (
                <div><dt>Steps</dt><dd className="feedback-review-block">{form.stepsToReproduce}</dd></div>
              )}
            </dl>
            <div className="feedback-form-actions">
              <button type="button" className="btn" onClick={() => setStep(1)}>Back</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? 'Sending…' : 'Submit feedback'}
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="feedback-success">
            <h2>Thanks — we got it</h2>
            <p>Your request ID (save this if you follow up):</p>
            <div className="feedback-request-id">
              <code>{requestId}</code>
              <button type="button" className="btn btn-sm" onClick={copyRequestId}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="feedback-success-note">
              We&apos;ll review it when we can. For urgent issues, email{' '}
              <a href={`mailto:${FEEDBACK_SUPPORT_EMAIL}`}>{FEEDBACK_SUPPORT_EMAIL}</a>
              {' '}with your request ID.
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setForm(EMPTY_FORM);
                setRequestId('');
                setStep(0);
              }}
            >
              Send another
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
