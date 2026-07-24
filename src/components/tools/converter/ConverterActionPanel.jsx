import { Download, Play, RotateCcw } from 'lucide-react';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';

/**
 * Convert / Cancel / Download action box (sits under settings).
 *
 * @param {{
 *   job: import('@/lib/tools/converter/converter-job-model.js').ConverterJob | null,
 *   onConvert: () => void,
 *   onCancel: () => void,
 *   onRetry: () => void,
 *   onDownload: () => void,
 *   canConvert: boolean,
 *   needsAcknowledgments?: boolean,
 * }} props
 */
export default function ConverterActionPanel({
  job,
  onConvert,
  onCancel,
  onRetry,
  onDownload,
  canConvert,
  needsAcknowledgments = false,
}) {
  if (!job) return null;

  const busy = job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED;
  const done = job.status === JOB_STATUS.COMPLETED && Boolean(job.output);
  const failed = job.status === JOB_STATUS.FAILED;

  return (
    <div className="converter-action-panel">
      {needsAcknowledgments && !busy && !done && (
        <p className="converter-action-hint">Check the confirmations above to enable Convert.</p>
      )}
      {busy && (
        <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--block" onClick={onCancel}>
          Cancel
        </button>
      )}
      {!busy && !done && (
        <button
          type="button"
          className="pdf-btn pdf-btn--primary pdf-btn--block"
          disabled={!canConvert}
          onClick={onConvert}
        >
          <Play size={14} /> Convert
        </button>
      )}
      {failed && (
        <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--block" onClick={onRetry}>
          <RotateCcw size={14} /> Retry
        </button>
      )}
      {done && (
        <button type="button" className="pdf-btn pdf-btn--primary pdf-btn--block" onClick={onDownload}>
          <Download size={14} /> Download
        </button>
      )}
    </div>
  );
}
