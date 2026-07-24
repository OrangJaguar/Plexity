import { Archive, BookOpen, FileText, Layers, Play, RefreshCw, RotateCcw, Trash2, XCircle } from 'lucide-react';
import {
  allJobsSelected,
  someJobsSelected,
} from '@/components/tools/converter/converter-ui-utils';
import { isJobReadyToConvert } from '@/hooks/useConverterWorkspace';

/**
 * @param {object} props
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} props.queueJobs
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} props.completedJobs
 * @param {ReadonlySet<string>} props.selectedJobIds
 * @param {() => void} props.onSelectAll
 * @param {() => void} props.onClearSelection
 * @param {() => void} props.onStartSelected
 * @param {() => void} props.onStartAll
 * @param {() => void} props.onCancelSelected
 * @param {() => void} props.onRetrySelected
 * @param {() => void} props.onRemoveCompleted
 * @param {(selectedOnly?: boolean) => void | Promise<void>} props.onDownloadZip
 * @param {() => void | Promise<void>} props.onReset
 * @param {number} props.packageProgress
 * @param {string | null} props.packageError
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.showRecipes]
 * @param {boolean} [props.showReport]
 * @param {boolean} [props.showStructure]
 * @param {() => void} [props.onToggleRecipes]
 * @param {() => void} [props.onToggleReport]
 * @param {() => void} [props.onToggleStructure]
 */
export default function ConverterQueueToolbar({
  queueJobs,
  completedJobs,
  selectedJobIds,
  onSelectAll,
  onClearSelection,
  onStartSelected,
  onStartAll,
  onCancelSelected,
  onRetrySelected,
  onRemoveCompleted,
  onDownloadZip,
  onReset,
  packageProgress,
  packageError,
  disabled = false,
  showRecipes,
  showReport,
  showStructure,
  onToggleRecipes,
  onToggleReport,
  onToggleStructure,
}) {
  const selectableJobs = queueJobs.filter((job) => !job.removed);
  const allSelected = allJobsSelected(selectedJobIds, selectableJobs);
  const hasSelection = someJobsSelected(selectedJobIds, selectableJobs);
  const readyCount = queueJobs.filter((job) => isJobReadyToConvert(job)).length;
  const selectedReadyCount = queueJobs.filter(
    (job) => selectedJobIds.has(job.id) && isJobReadyToConvert(job),
  ).length;
  const failedSelected = queueJobs.some(
    (job) => selectedJobIds.has(job.id) && (job.status === 'failed' || job.status === 'cancelled'),
  );
  const processingSelected = queueJobs.some(
    (job) => selectedJobIds.has(job.id) && job.status === 'processing',
  );

  return (
    <section className="tools-converter-toolbar" aria-label="Queue actions">
      <div className="tools-converter-toolbar-row">
        <label className="tools-converter-select-all">
          <input
            type="checkbox"
            checked={allSelected && selectableJobs.length > 0}
            ref={(node) => {
              if (node) node.indeterminate = hasSelection && !allSelected;
            }}
            onChange={() => {
              if (allSelected) onClearSelection();
              else onSelectAll();
            }}
            disabled={disabled || selectableJobs.length === 0}
            aria-label={allSelected ? 'Clear selection' : 'Select all queue files'}
          />
          <span>{hasSelection ? `${selectedJobIds.size} selected` : 'Select all'}</span>
        </label>

        <div className="tools-converter-toolbar-actions">
          {selectedReadyCount > 0 && (
            <button
              type="button"
              className="tools-converter-btn tools-converter-btn--primary"
              onClick={onStartSelected}
              disabled={disabled}
            >
              <Play size={16} aria-hidden />
              Convert selected ({selectedReadyCount})
            </button>
          )}
          {!hasSelection && readyCount > 0 && (
            <button
              type="button"
              className="tools-converter-btn tools-converter-btn--primary"
              onClick={onStartAll}
              disabled={disabled}
            >
              <Play size={16} aria-hidden />
              Convert all ({readyCount})
            </button>
          )}
          {processingSelected && (
            <button
              type="button"
              className="tools-converter-btn"
              onClick={onCancelSelected}
              disabled={disabled}
            >
              <XCircle size={16} aria-hidden />
              Cancel
            </button>
          )}
          {failedSelected && (
            <button
              type="button"
              className="tools-converter-btn"
              onClick={onRetrySelected}
              disabled={disabled}
            >
              <RotateCcw size={16} aria-hidden />
              Retry failed
            </button>
          )}
          {completedJobs.length > 0 && (
            <>
              <button
                type="button"
                className="tools-converter-btn tools-converter-btn--zip"
                onClick={() => void onDownloadZip(hasSelection)}
                disabled={disabled || (packageProgress > 0 && packageProgress < 1)}
              >
                <Archive size={16} aria-hidden />
                Download ZIP
              </button>
              <button
                type="button"
                className="tools-converter-btn"
                onClick={onRemoveCompleted}
                disabled={disabled}
              >
                <Trash2 size={16} aria-hidden />
                Remove completed
              </button>
            </>
          )}
          <button
            type="button"
            className="tools-converter-btn tools-converter-btn--ghost"
            onClick={() => void onReset()}
            disabled={disabled}
          >
            <RefreshCw size={16} aria-hidden />
            Reset
          </button>
          {onToggleRecipes && (
            <button
              type="button"
              className={`tools-converter-btn tools-converter-btn--ghost${showRecipes ? ' tools-converter-btn--active' : ''}`}
              aria-pressed={Boolean(showRecipes)}
              onClick={onToggleRecipes}
              disabled={disabled}
            >
              <BookOpen size={16} aria-hidden />
              Recipes
            </button>
          )}
          {onToggleReport && (
            <button
              type="button"
              className={`tools-converter-btn tools-converter-btn--ghost${showReport ? ' tools-converter-btn--active' : ''}`}
              aria-pressed={Boolean(showReport)}
              onClick={onToggleReport}
              disabled={disabled}
            >
              <FileText size={16} aria-hidden />
              Report
            </button>
          )}
          {onToggleStructure && (
            <button
              type="button"
              className={`tools-converter-btn tools-converter-btn--ghost${showStructure ? ' tools-converter-btn--active' : ''}`}
              aria-pressed={Boolean(showStructure)}
              onClick={onToggleStructure}
              disabled={disabled}
            >
              <Layers size={16} aria-hidden />
              Merge/split
            </button>
          )}
        </div>
      </div>

      {packageProgress > 0 && packageProgress < 1 && (
        <div
          className="tools-converter-package-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(packageProgress * 100)}
          aria-label="ZIP packaging progress"
        >
          <div
            className="tools-converter-progress-bar"
            style={{ width: `${Math.round(packageProgress * 100)}%` }}
          />
        </div>
      )}

      {packageError && (
        <p className="tools-converter-toolbar-error" role="alert">
          {packageError}
        </p>
      )}
    </section>
  );
}
