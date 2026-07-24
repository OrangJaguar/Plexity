import { REMOTE_TERMINAL_STATES } from '@/lib/tools/converter/remote-job-schema.js';

/**
 * Remote job queue — separate from local File/OPFS converter jobs.
 */
export default function ConverterRemoteJobQueue({
  jobs,
  busy,
  onCancel,
  onRetry,
  onDownload,
}) {
  if (!jobs?.length) {
    return (
      <p className="tools-converter-muted">No remote URL jobs yet.</p>
    );
  }

  return (
    <div className="tools-converter-remote-queue" role="region" aria-labelledby="remote-queue-heading">
      <h3 id="remote-queue-heading">Remote URL jobs</h3>
      <ul className="tools-converter-remote-job-list">
        {jobs.map((job) => {
          const jobId = String(job.jobId);
          const status = String(job.status || '');
          const terminal = REMOTE_TERMINAL_STATES.has(status);
          const fraction = typeof job.progressFraction === 'number'
            ? Math.round(Math.min(1, Math.max(0, job.progressFraction)) * 100)
            : 0;

          return (
            <li key={jobId} className="tools-converter-remote-job">
              <div className="tools-converter-remote-job-main">
                <strong>{job.redactedSourceLabel || jobId}</strong>
                <span className="tools-converter-muted">
                  {' '}
                  · {job.provider} · {status}
                  {job.errorCode ? ` · ${job.errorCode}` : ''}
                </span>
                {!terminal && (
                  <div
                    className="tools-converter-progress-bar-track"
                    role="progressbar"
                    aria-valuenow={fraction}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Progress for ${job.redactedSourceLabel || jobId}`}
                  >
                    <div
                      className="tools-converter-progress-bar"
                      style={{ width: `${fraction}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="tools-converter-remote-job-actions">
                {!terminal && (
                  <button
                    type="button"
                    className="tools-converter-btn"
                    disabled={busy}
                    onClick={() => onCancel(jobId)}
                  >
                    Cancel
                  </button>
                )}
                {(status === 'failed' || status === 'cancelled') && (
                  <button
                    type="button"
                    className="tools-converter-btn"
                    disabled={busy}
                    onClick={() => onRetry(jobId)}
                  >
                    Retry
                  </button>
                )}
                {status === 'ready' && (
                  <button
                    type="button"
                    className="tools-converter-btn tools-converter-btn-primary"
                    disabled={busy}
                    onClick={() => onDownload(jobId)}
                  >
                    Download
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
