/**
 * Pre-processing review for Authorized URL Import.
 */
export default function ConverterUrlReviewPanel({
  session,
  requiresYouTubeAck,
  canConfirm,
  busy,
  onAck,
  onValidate,
  onConfirm,
  onClear,
}) {
  const { parseResult, acknowledgments } = session;
  const { accepted, rejected, deferred, duplicates } = parseResult;

  return (
    <div className="tools-converter-url-review" role="region" aria-labelledby="url-review-heading">
      <h3 id="url-review-heading">Review before processing</h3>
      <p>
        {accepted.length} accepted · {rejected.length} rejected · {deferred.length} deferred
        {duplicates.length ? ` · ${duplicates.length} duplicates` : ''}
      </p>

      {accepted.length > 0 && (
        <ReviewList title="Accepted" items={accepted} tone="ok" />
      )}
      {rejected.length > 0 && (
        <ReviewList title="Rejected" items={rejected} tone="bad" />
      )}
      {deferred.length > 0 && (
        <div className="tools-converter-url-review-group">
          <h4>Needs playlist discovery</h4>
          <p className="tools-converter-muted">
            Playlists, channels, and feeds use Authorized URL Import discovery (admin Plan 6).
            Open Playlist &amp; feed discovery when that capability is enabled, or use single-video URLs here.
          </p>
          <ReviewList title="" items={deferred} tone="warn" />
        </div>
      )}

      <fieldset className="tools-converter-url-acks" disabled={busy}>
        <legend>Acknowledgments</legend>
        <label className="tools-converter-url-ack">
          <input
            type="checkbox"
            checked={acknowledgments.sourceRights}
            onChange={(e) => onAck('sourceRights', e.target.checked)}
          />
          I confirm I am authorized to process these sources and that processing them does not
          violate applicable rights or terms.
        </label>
        {requiresYouTubeAck && (
          <label className="tools-converter-url-ack">
            <input
              type="checkbox"
              checked={acknowledgments.youtubeTermsRisk}
              onChange={(e) => onAck('youtubeTermsRisk', e.target.checked)}
            />
            I understand YouTube extraction is admin-only, carries Terms-of-Service and copyright
            risk, and this acknowledgment does not provide legal protection.
          </label>
        )}
      </fieldset>

      <div className="tools-converter-url-actions">
        <button type="button" className="tools-converter-btn" disabled={busy} onClick={onValidate}>
          Re-validate with server
        </button>
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn-primary"
          disabled={busy || !canConfirm}
          onClick={onConfirm}
        >
          Start processing
        </button>
        <button type="button" className="tools-converter-btn" disabled={busy} onClick={onClear}>
          Clear review
        </button>
      </div>
    </div>
  );
}

function ReviewList({ title, items, tone }) {
  return (
    <div className={`tools-converter-url-review-group tone-${tone}`}>
      {title ? <h4>{title}</h4> : null}
      <ul>
        {items.map((item) => (
          <li key={item.localId}>
            <span>{item.redactedLabel}</span>
            <span className="tools-converter-muted">
              {' '}
              · {item.provider}
              {item.reason ? ` · ${item.reason}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
