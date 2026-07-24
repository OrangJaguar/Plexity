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
 * @param {(job: import('@/lib/tools/converter/converter-job-model.js').ConverterJob) => boolean} props.isReady
 * @param {(job: import('@/lib/tools/converter/converter-job-model.js').ConverterJob) => string} props.getStatusLabel
 */
export default function ConverterJobList({
  jobs,
  deviceProfile,
  canShare,
  selectedJobIds,
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
  isReady,
  getStatusLabel,
}) {
  if (!jobs.length) {
    return (
      <p className="tools-converter-empty" id="converter-jobs-empty">
        No files in the queue. Add files above to start converting.
      </p>
    );
  }

  return (
    <ol className="tools-converter-job-list" aria-labelledby="converter-jobs-heading">
      {jobs.map((job) => (
        <li key={job.id}>
          <ConverterJobCard
            job={job}
            deviceProfile={deviceProfile}
            canShare={canShare}
            isReady={isReady(job)}
            isSelected={selectedJobIds.has(job.id)}
            statusLabel={getStatusLabel(job)}
            acknowledgments={acknowledgments}
            onToggleSelect={onToggleSelect}
            onAcknowledge={onAcknowledge}
            onSetOperation={onSetOperation}
            onSetOptions={onSetOptions}
            onSetPlanFields={onSetPlanFields}
            onStart={onStart}
            onCancel={onCancel}
            onRetry={onRetry}
            onRemove={onRemove}
            onDownload={onDownload}
            onShare={onShare}
            onCompare={onCompare}
          />
        </li>
      ))}
    </ol>
  );
}
