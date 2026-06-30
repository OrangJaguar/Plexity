import { Link } from 'react-router-dom';

/**
 * Shared full-page error UI for route boundaries and tool failures.
 */
export default function ErrorFallback({
  title = 'Something went wrong',
  message = "We've logged this issue. You can try again or return to the dashboard.",
  onRetry,
  retryLabel = 'Try again',
  showHome = true,
  showDashboard = true,
  compact = false,
}) {
  return (
    <div className={`error-fallback${compact ? ' error-fallback--compact' : ''}`} role="alert">
      <h1 className="error-fallback-title">{title}</h1>
      <p className="error-fallback-text">{message}</p>
      <div className="error-fallback-actions">
        {onRetry && (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
        {showDashboard && (
          <Link to="/dashboard" className="btn">Open dashboard</Link>
        )}
        {showHome && (
          <Link to="/" className="btn">Return home</Link>
        )}
      </div>
    </div>
  );
}
