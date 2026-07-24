import { useState } from 'react';
import { GitCompare } from 'lucide-react';
import {
  getOperationById,
  listOperationsForInputFormat,
  resolveConversionSupport,
} from '@/lib/tools/converter/conversion-capabilities.js';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';
import ConverterAdvancedDrawer from '@/components/tools/converter/ConverterAdvancedDrawer';
import ConverterResultPreview from '@/components/tools/converter/ConverterResultPreview';
import ConverterSourceInspector from '@/components/tools/converter/ConverterSourceInspector';
import {
  formatJobSizeEstimate,
  getDestructiveWarnings,
  getOperationLabel,
  hasRequiredAcknowledgments,
  jobProgressPercent,
} from '@/components/tools/converter/converter-ui-utils';

/**
 * @param {object} props
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} props.job
 * @param {import('@/lib/tools/converter/converter-limits.js').DeviceProfile} props.deviceProfile
 * @param {boolean} props.canShare
 * @param {boolean} props.isReady
 * @param {boolean} props.isSelected
 * @param {string} props.statusLabel
 * @param {Record<string, Record<string, boolean>>} props.acknowledgments
 * @param {(jobId: string, selected: boolean) => void} props.onToggleSelect
 * @param {(jobId: string, warningCode: string, acknowledged: boolean) => void} props.onAcknowledge
 * @param {(jobId: string, operationId: string) => void} props.onSetOperation
 * @param {(jobId: string, options: Record<string, unknown>) => void} props.onSetOptions
 * @param {(jobId: string, partialPlan: Record<string, unknown>) => void} props.onSetPlanFields
 * @param {(jobId: string) => void} props.onStart
 * @param {(jobId: string) => void} props.onCancel
 * @param {(jobId: string) => void} props.onRetry
 * @param {(jobId: string) => void} props.onRemove
 * @param {(jobId: string) => void} props.onDownload
 * @param {(jobId: string) => void | Promise<boolean>} props.onShare
 * @param {(jobId: string) => void} [props.onCompare]
 */
export default function ConverterJobCard({
  job,
  deviceProfile,
  canShare,
  isReady,
  isSelected,
  statusLabel,
  acknowledgments,
  onToggleSelect,
  onAcknowledge,
  onSetOperation,
  onSetOptions,
  onSetPlanFields,
  onStart,
  onCancel,
  onRetry,
  onRemove,
  onDownload,
  onShare,
  onCompare,
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const format = job.source.detectedFormat ?? job.analysis?.format ?? '';
  const operations = listOperationsForInputFormat(String(format)).filter(
    (op) => resolveConversionSupport(op, deviceProfile).supported,
  );
  const selectedOp = getOperationById(job.operationId ?? '');
  const progress = jobProgressPercent(job);
  const showProgress = job.status === JOB_STATUS.PROCESSING
    || (job.status === JOB_STATUS.ANALYZING && !job.analysis);
  const destructiveWarnings = getDestructiveWarnings(job, deviceProfile);
  const acksComplete = hasRequiredAcknowledgments(job, acknowledgments);
  const canConvert = isReady && acksComplete;
  const sizeLine = formatJobSizeEstimate(job);
  const canCompare = Boolean(job.output?.objectUrl && onCompare);

  return (
    <article
      className={`tools-converter-job-card${isSelected ? ' tools-converter-job-card--selected' : ''}`}
      aria-labelledby={`job-title-${job.id}`}
    >
      <header className="tools-converter-job-card-header">
        <label className="tools-converter-job-select">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(event) => onToggleSelect(job.id, event.target.checked)}
            aria-label={`Select ${job.source.name}`}
          />
        </label>
        <div className="tools-converter-job-card-heading">
          <h3 id={`job-title-${job.id}`}>{job.source.name}</h3>
          <p className="tools-converter-job-meta">
            {selectedOp ? getOperationLabel(selectedOp) : 'Analyzing…'}
            {format ? ` · ${format.toUpperCase()}` : ''}
          </p>
          {sizeLine && (
            <p className="tools-converter-job-size-estimate">{sizeLine}</p>
          )}
        </div>
        <p className="tools-converter-job-status" data-status={job.status}>
          {statusLabel}
        </p>
      </header>

      <ConverterSourceInspector source={job.source} analysis={job.analysis} />

      {!job.output && operations.length > 0 && (
        <label className="tools-converter-field">
          <span>Convert to</span>
          <select
            value={job.operationId ?? ''}
            onChange={(event) => onSetOperation(job.id, event.target.value)}
            disabled={job.status === JOB_STATUS.PROCESSING}
          >
            {operations.map((op) => (
              <option key={op.id} value={op.id}>
                {getOperationLabel(op)}
              </option>
            ))}
          </select>
        </label>
      )}

      {selectedOp && !job.output && (
        <ConverterAdvancedDrawer
          job={job}
          acknowledgments={acknowledgments}
          onChangeOptions={(options) => onSetOptions(job.id, options)}
          onChangePlanFields={(partialPlan) => onSetPlanFields(job.id, partialPlan)}
          onAcknowledge={onAcknowledge}
          disabled={job.status === JOB_STATUS.PROCESSING}
        />
      )}

      {destructiveWarnings.length > 0 && !job.output && (
        <fieldset className="tools-converter-acknowledgments">
          <legend>Confirm before converting</legend>
          {destructiveWarnings.map((warning) => (
            <label key={warning.code} className="tools-converter-field tools-converter-field--inline">
              <input
                type="checkbox"
                checked={acknowledgments[job.id]?.[warning.code] === true}
                onChange={(event) => onAcknowledge(job.id, warning.code, event.target.checked)}
              />
              <span>{warning.message}</span>
            </label>
          ))}
        </fieldset>
      )}

      {showProgress && (
        <div
          className="tools-converter-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label={`${job.source.name} progress`}
        >
          <div className="tools-converter-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {job.error && (
        <p className="tools-converter-error" role="alert">
          {job.error.message}
          <span className="tools-converter-error-code">{job.error.code}</span>
        </p>
      )}

      {job.output && (
        <ConverterResultPreview
          output={job.output}
          analysis={job.analysis}
          category={job.analysis?.category}
          estimate={job.estimate ?? job.plan?.estimate}
          checksum={job.checksum}
        />
      )}

      <details
        className="tools-converter-job-details"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary>Technical details</summary>
        <dl className="tools-converter-inspector-grid">
          <div className="tools-converter-inspector-row">
            <dt>Job ID</dt>
            <dd><code>{job.id}</code></dd>
          </div>
          <div className="tools-converter-inspector-row">
            <dt>Operation</dt>
            <dd><code>{job.operationId ?? 'none'}</code></dd>
          </div>
          <div className="tools-converter-inspector-row">
            <dt>Status</dt>
            <dd>{job.status}</dd>
          </div>
          {job.progress?.phase && (
            <div className="tools-converter-inspector-row">
              <dt>Phase</dt>
              <dd>{job.progress.phase}</dd>
            </div>
          )}
        </dl>
      </details>

      <div className="tools-converter-actions">
        {canConvert && (
          <button type="button" className="tools-converter-btn tools-converter-btn--primary" onClick={() => onStart(job.id)}>
            Convert
          </button>
        )}
        {isReady && !acksComplete && (
          <p className="tools-converter-ack-hint">Acknowledge warnings to convert.</p>
        )}
        {job.status === JOB_STATUS.PROCESSING && (
          <button type="button" className="tools-converter-btn" onClick={() => onCancel(job.id)}>
            Cancel
          </button>
        )}
        {(job.status === JOB_STATUS.FAILED || job.status === JOB_STATUS.CANCELLED) && (
          <button type="button" className="tools-converter-btn" onClick={() => onRetry(job.id)}>
            Retry
          </button>
        )}
        {job.status === JOB_STATUS.COMPLETED && (
          <>
            <button type="button" className="tools-converter-btn tools-converter-btn--primary" onClick={() => onDownload(job.id)}>
              Download
            </button>
            {canShare && (
              <button type="button" className="tools-converter-btn" onClick={() => void onShare(job.id)}>
                Share
              </button>
            )}
            {canCompare && (
              <button
                type="button"
                className="tools-converter-btn"
                onClick={() => onCompare?.(job.id)}
              >
                <GitCompare size={16} aria-hidden />
                Compare
              </button>
            )}
          </>
        )}
        <button type="button" className="tools-converter-btn tools-converter-btn--ghost" onClick={() => onRemove(job.id)}>
          Remove
        </button>
      </div>
    </article>
  );
}
