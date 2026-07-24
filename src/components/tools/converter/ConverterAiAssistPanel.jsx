import { useState } from 'react';
import ConverterAiReviewCard from '@/components/tools/converter/ConverterAiReviewCard';
import { useAdminConverterAiAssist } from '@/hooks/useAdminConverterAiAssist';

/**
 * Admin NL assist panel — drafts allowlisted ConversionPlan / recipe only.
 */
export default function ConverterAiAssistPanel({
  onApplyLocalPlan,
  onApplyRemotePlan,
  canApplyRemote = false,
}) {
  const assist = useAdminConverterAiAssist();
  const [request, setRequest] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  return (
    <section className="tools-converter-ai-panel" aria-labelledby="converter-ai-assist-heading">
      <h2 id="converter-ai-assist-heading">AI conversion assist</h2>
      <p className="tools-converter-url-privacy">
        Admin-only. Your prompt is sent to a temporary cloud AI job, then deleted.
        Results are allowlisted plan drafts — never raw shell or ffmpeg argv. Confirm before apply.
      </p>
      {assist.session?.budget && (
        <p className="tools-converter-muted">
          Remaining AI requests today: {assist.session.budget.remainingRequests}
          {assist.softBudgetWarning ? ' · approaching soft budget' : ''}
        </p>
      )}
      <label className="tools-converter-url-paste-label" htmlFor="converter-ai-assist-input">
        Describe the conversion you want
      </label>
      <textarea
        id="converter-ai-assist-input"
        className="tools-converter-url-paste"
        rows={3}
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        disabled={assist.busy}
        placeholder="e.g. Make this video smaller for email"
      />
      <div className="tools-converter-url-actions">
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn-primary"
          disabled={assist.busy || !request.trim()}
          onClick={() => {
            setConfirmed(false);
            void assist.requestPlan(request);
          }}
        >
          Draft plan
        </button>
        <button
          type="button"
          className="tools-converter-btn"
          disabled={assist.busy}
          onClick={() => void assist.requestCompress()}
        >
          Suggest compress
        </button>
      </div>
      {assist.error && <p className="tools-converter-error" role="alert">{assist.error}</p>}
      {assist.draft?.plan && (
        <ConverterAiReviewCard
          title="Review assist draft"
          explanation={assist.draft.explanation}
          warnings={assist.draft.warnings}
          plan={assist.draft.plan}
          confirmed={confirmed}
          onConfirmedChange={setConfirmed}
          busy={assist.busy}
          onDismiss={() => {
            setConfirmed(false);
            assist.clearDraft();
          }}
          onApply={() => {
            if (!confirmed || !assist.draft?.plan) return;
            onApplyLocalPlan?.(assist.draft.plan);
            if (canApplyRemote) onApplyRemotePlan?.(assist.draft.plan);
            setConfirmed(false);
            assist.clearDraft();
          }}
        />
      )}
    </section>
  );
}
