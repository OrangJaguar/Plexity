import { useMemo } from 'react';
import { Archive } from 'lucide-react';
import ConverterComparePane from '@/components/tools/converter/ConverterComparePane';
import ConverterJobCard from '@/components/tools/converter/ConverterJobCard';

/**
 * @param {object} props
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} props.jobs
 * @param {import('@/lib/tools/converter/converter-limits.js').DeviceProfile} props.deviceProfile
 * @param {boolean} props.canShare
 * @param {ReadonlySet<string>} props.selectedJobIds
 * @param {Record<string, Record<string, boolean>>} props.acknowledgments
 * @param {(jobId: string, selected: boolean) => void} props.onToggleSelect
 * @param {(jobId: string, warningCode: string, acknowledged: boolean) => void} props.onAcknowledge
 * @param {(jobId: string, partialPlan: Record<string, unknown>) => void} [props.onSetPlanFields]
 * @param {(jobId: string) => void} props.onRemove
 * @param {(jobId: string) => void} props.onDownload
 * @param {(jobId: string) => void | Promise<boolean>} props.onShare
 * @param {(selectedOnly?: boolean) => void | Promise<void>} props.onDownloadZip
 * @param {(jobId: string) => void} [props.onCompare]
 * @param {number} props.packageProgress
 * @param {(job: import('@/lib/tools/converter/converter-job-model.js').ConverterJob) => string} props.getStatusLabel
 * @param {string | null} [props.compareJobId]
 * @param {(jobId: string | null) => void} [props.onCompareJobIdChange]
 * @param {(jobId: string) => string | null} [props.getSourceObjectUrl]
 */
export default function ConverterResultsGroup({
  jobs,
  deviceProfile,
  canShare,
  selectedJobIds,
  acknowledgments,
  onToggleSelect,
  onAcknowledge,
  onSetPlanFields,
  onRemove,
  onDownload,
  onShare,
  onDownloadZip,
  onCompare,
  packageProgress,
  getStatusLabel,
  compareJobId = null,
  onCompareJobIdChange,
  getSourceObjectUrl,
}) {
  const compareJob = useMemo(
    () => jobs.find((job) => job.id === compareJobId) ?? null,
    [compareJobId, jobs],
  );

  if (!jobs.length) return null;

  const selectedCompletedCount = jobs.filter((job) => selectedJobIds.has(job.id)).length;
  const activeCompareJob = compareJob?.output ? compareJob : null;

  return (
    <section className="tools-converter-results" aria-labelledby="converter-results-heading">
      <div className="tools-converter-results-header">
        <div>
          <h2 id="converter-results-heading">Results</h2>
          <p>{jobs.length} completed file{jobs.length === 1 ? '' : 's'}</p>
        </div>
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn--zip"
          onClick={() => void onDownloadZip(selectedCompletedCount > 0)}
          disabled={packageProgress > 0 && packageProgress < 1}
        >
          <Archive size={16} aria-hidden />
          {selectedCompletedCount > 0 ? `Download ${selectedCompletedCount} as ZIP` : 'Download all as ZIP'}
        </button>
      </div>

      {activeCompareJob && (
        <ConverterComparePane
          job={activeCompareJob}
          sourceUrl={getSourceObjectUrl?.(activeCompareJob.id) ?? undefined}
          outputUrl={activeCompareJob.output?.objectUrl ?? undefined}
          onClose={() => onCompareJobIdChange?.(null)}
        />
      )}

      <ol className="tools-converter-job-list">
        {jobs.map((job) => (
          <li key={job.id}>
            <ConverterJobCard
              job={job}
              deviceProfile={deviceProfile}
              canShare={canShare}
              isReady={false}
              isSelected={selectedJobIds.has(job.id)}
              statusLabel={getStatusLabel(job)}
              acknowledgments={acknowledgments}
              onToggleSelect={onToggleSelect}
              onAcknowledge={onAcknowledge}
              onSetOperation={() => {}}
              onSetOptions={() => {}}
              onSetPlanFields={onSetPlanFields ?? (() => {})}
              onStart={() => {}}
              onCancel={() => {}}
              onRetry={() => {}}
              onRemove={onRemove}
              onDownload={onDownload}
              onShare={onShare}
              onCompare={onCompareJobIdChange ? (jobId) => onCompareJobIdChange(jobId) : onCompare}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
