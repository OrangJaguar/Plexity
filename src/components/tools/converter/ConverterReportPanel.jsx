import { useMemo } from 'react';
import { FileJson, FileText } from 'lucide-react';
import {
  createConversionReport,
  exportReportJson,
  exportReportMarkdown,
} from '@/lib/tools/converter/conversion-report.js';
import { formatChecksumShort } from '@/lib/tools/converter/checksums.js';

/**
 * @param {object} props
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} props.jobs
 * @param {() => void} [props.onExportJson]
 * @param {() => void} [props.onExportMarkdown]
 * @param {boolean} [props.disabled]
 */
export default function ConverterReportPanel({
  jobs,
  onExportJson,
  onExportMarkdown,
  disabled = false,
}) {
  const report = useMemo(() => createConversionReport({ jobs }), [jobs]);
  const checksumJobs = useMemo(
    () => jobs.filter((job) => job.checksum),
    [jobs],
  );

  const checksumText = (checksum) => {
    if (!checksum) return '';
    if (typeof checksum === 'string') return formatChecksumShort(checksum);
    if (typeof checksum === 'object' && checksum.hex) return formatChecksumShort(checksum.hex);
    return formatChecksumShort(String(checksum));
  };

  const downloadText = (content, fileName, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleJson = () => {
    downloadText(exportReportJson(report), `converter-report-${Date.now()}.json`, 'application/json');
    onExportJson?.();
  };

  const handleMarkdown = () => {
    downloadText(exportReportMarkdown(report), `converter-report-${Date.now()}.md`, 'text/markdown');
    onExportMarkdown?.();
  };

  if (!jobs.length) return null;

  return (
    <section className="tools-converter-report" aria-labelledby="converter-report-heading">
      <div className="tools-converter-report-header">
        <div>
          <h2 id="converter-report-heading">Conversion report</h2>
          <p>
            {report.succeeded} completed · {report.failed} failed · {report.cancelled} cancelled
          </p>
        </div>
        <div className="tools-converter-report-actions">
          <button
            type="button"
            className="tools-converter-btn"
            disabled={disabled}
            onClick={handleJson}
          >
            <FileJson size={16} aria-hidden />
            Download JSON
          </button>
          <button
            type="button"
            className="tools-converter-btn"
            disabled={disabled}
            onClick={handleMarkdown}
          >
            <FileText size={16} aria-hidden />
            Download Markdown
          </button>
        </div>
      </div>

      {checksumJobs.length > 0 && (
        <ul className="tools-converter-report-checksums">
          {checksumJobs.map((job) => (
            <li key={job.id}>
              <span>{job.output?.fileName ?? job.id}</span>
              <code>{checksumText(job.checksum)}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
