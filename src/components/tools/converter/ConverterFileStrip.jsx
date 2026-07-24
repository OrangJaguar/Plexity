import { FileAudio, FileImage, FileSpreadsheet, FileVideo, X } from 'lucide-react';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';

/**
 * @param {string | null | undefined} category
 */
function CategoryIcon({ category }) {
  const size = 16;
  switch (category) {
    case 'image':
      return <FileImage size={size} aria-hidden />;
    case 'audio':
      return <FileAudio size={size} aria-hidden />;
    case 'video':
      return <FileVideo size={size} aria-hidden />;
    case 'data':
      return <FileSpreadsheet size={size} aria-hidden />;
    default:
      return <FileImage size={size} aria-hidden />;
  }
}

/**
 * Horizontal file strip — proof uploads landed; click to focus one file.
 *
 * @param {{
 *   jobs: ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>,
 *   activeJobId: string | null,
 *   sourceUrls: Record<string, string | null>,
 *   onSelect: (jobId: string) => void,
 *   onRemove: (jobId: string) => void,
 * }} props
 */
export default function ConverterFileStrip({
  jobs,
  activeJobId,
  sourceUrls,
  onSelect,
  onRemove,
}) {
  const visible = jobs.filter((job) => !job.removed);

  return (
    <div className="converter-file-strip" role="list" aria-label="Uploaded files">
      {visible.map((job) => {
        const category = job.analysis?.category ?? job.source.category ?? 'unknown';
        const selected = job.id === activeJobId;
        const done = job.status === JOB_STATUS.COMPLETED && Boolean(job.output);
        const failed = job.status === JOB_STATUS.FAILED;
        const thumbUrl = category === 'image' ? sourceUrls[job.id] : null;

        return (
          <div
            key={job.id}
            role="listitem"
            className={[
              'converter-file-chip',
              selected ? 'converter-file-chip--selected' : '',
              done ? 'converter-file-chip--done' : '',
              failed ? 'converter-file-chip--failed' : '',
            ].filter(Boolean).join(' ')}
          >
            <button
              type="button"
              className="converter-file-chip-main"
              onClick={() => onSelect(job.id)}
              aria-pressed={selected}
              title={job.source.name}
            >
              <span className="converter-file-chip-thumb">
                {thumbUrl ? (
                  <img src={thumbUrl} alt="" />
                ) : (
                  <CategoryIcon category={String(category)} />
                )}
              </span>
              <span className="converter-file-chip-name">{job.source.name}</span>
              {done && <span className="converter-file-chip-badge">Done</span>}
              {failed && <span className="converter-file-chip-badge converter-file-chip-badge--fail">Failed</span>}
            </button>
            <button
              type="button"
              className="pdf-icon-btn"
              aria-label={`Remove ${job.source.name}`}
              onClick={() => onRemove(job.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
