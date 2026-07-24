/**
 * Shared human-review confirm card for AI plan drafts and cost buckets.
 */
export default function ConverterAiReviewCard({
  title = 'Review AI draft',
  explanation = '',
  warnings = [],
  plan = null,
  costBucket = 'lt1c',
  confirmed = false,
  onConfirmedChange,
  onApply,
  onDismiss,
  applyLabel = 'Apply to selected',
  busy = false,
}) {
  return (
    <div className="tools-converter-ai-review" role="region" aria-label={title}>
      <h3>{title}</h3>
      {explanation && <p className="tools-converter-muted">{explanation}</p>}
      {plan?.operationId && (
        <pre className="tools-converter-ai-plan-diff" tabIndex={0}>
          {JSON.stringify({
            operationId: plan.operationId,
            goalId: plan.goalId || null,
            options: plan.options || {},
          }, null, 2)}
        </pre>
      )}
      {warnings?.length > 0 && (
        <ul className="tools-converter-muted">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <p className="tools-converter-muted">
        Estimated cost bucket: {costBucket}. Temporary cloud processing; uploads are deleted after completion.
      </p>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmedChange?.(e.target.checked)}
          disabled={busy}
        />
        I reviewed this draft and confirm applying it
      </label>
      <div className="tools-converter-url-actions">
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn-primary"
          disabled={busy || !confirmed}
          onClick={() => onApply?.()}
        >
          {applyLabel}
        </button>
        {onDismiss && (
          <button type="button" className="tools-converter-btn" disabled={busy} onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
