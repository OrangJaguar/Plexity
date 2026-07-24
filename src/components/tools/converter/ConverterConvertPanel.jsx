import { useEffect, useMemo, useState } from 'react';
import {
  getOperationById,
  listOperationsForInputFormat,
  resolveConversionSupport,
} from '@/lib/tools/converter/conversion-capabilities.js';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';
import { replaceExtension, sanitizeFileName } from '@/lib/tools/converter/converter-filenames.js';
import {
  formatByteSize,
  getDestructiveWarnings,
} from '@/components/tools/converter/converter-ui-utils';
import AppCheckbox from '@/components/shared/form/AppCheckbox';

/**
 * @param {import('@/lib/tools/converter/conversion-capabilities.js').ConversionOperation} op
 * @returns {string}
 */
function formatOptionLabel(op) {
  return String(op.outputFormat ?? op.extension ?? 'OUT').toUpperCase();
}

/**
 * @param {import('@/lib/tools/converter/conversion-capabilities.js').ConversionOperation} op
 * @returns {boolean}
 */
function isExtractAudioOp(op) {
  return String(op.id).startsWith('extract-audio-');
}

/**
 * Side panel: mode, convert-to, output name, confirms.
 *
 * @param {{
 *   job: import('@/lib/tools/converter/converter-job-model.js').ConverterJob | null,
 *   deviceProfile: import('@/lib/tools/converter/converter-limits.js').DeviceProfile,
 *   acknowledgments: Record<string, Record<string, boolean>>,
 *   outputStem: string,
 *   onOutputStemChange: (stem: string) => void,
 *   onSetOperation: (operationId: string) => void,
 *   onAcknowledge: (code: string, checked: boolean) => void,
 * }} props
 */
export default function ConverterConvertPanel({
  job,
  deviceProfile,
  acknowledgments,
  outputStem,
  onOutputStemChange,
  onSetOperation,
  onAcknowledge,
}) {
  const format = job?.source.detectedFormat ?? job?.analysis?.format ?? '';
  const category = job?.analysis?.category ?? job?.source.category ?? null;
  const sourceIsVideo = category === 'video'
    || ['mp4', 'webm', 'mkv', 'avi', 'mov', 'm4v', 'mpeg', 'mpg'].includes(String(format).toLowerCase());

  const allOperations = useMemo(() => {
    if (!format) return [];
    return listOperationsForInputFormat(String(format)).filter(
      (op) => resolveConversionSupport(op, deviceProfile).supported,
    );
  }, [format, deviceProfile]);

  const convertOps = useMemo(
    () => allOperations.filter((op) => !isExtractAudioOp(op)),
    [allOperations],
  );
  const extractOps = useMemo(
    () => allOperations.filter((op) => isExtractAudioOp(op)),
    [allOperations],
  );

  const selectedOp = getOperationById(job?.operationId ?? '');
  const selectedIsExtract = selectedOp ? isExtractAudioOp(selectedOp) : false;
  const [videoMode, setVideoMode] = useState(/** @type {'convert' | 'extract'} */ (
    selectedIsExtract ? 'extract' : 'convert'
  ));

  useEffect(() => {
    if (!job) return;
    setVideoMode(selectedIsExtract ? 'extract' : 'convert');
  }, [job?.id, selectedIsExtract]);

  const operations = sourceIsVideo
    ? (videoMode === 'extract' ? extractOps : convertOps)
    : convertOps.length ? convertOps : allOperations;

  const busy = job?.status === JOB_STATUS.PROCESSING || job?.status === JOB_STATUS.QUEUED;
  const done = job?.status === JOB_STATUS.COMPLETED && Boolean(job?.output);

  const predictedName = selectedOp
    ? replaceExtension(sanitizeFileName(outputStem || 'file'), selectedOp.extension)
    : sanitizeFileName(outputStem || 'file');

  const destructiveWarnings = job ? getDestructiveWarnings(job, deviceProfile) : [];

  const switchVideoMode = (mode) => {
    setVideoMode(mode);
    const list = mode === 'extract' ? extractOps : convertOps;
    if (!list.length) return;
    const stillValid = list.some((op) => op.id === job?.operationId);
    if (!stillValid) onSetOperation(list[0].id);
  };

  if (!job) {
    return (
      <aside className="pdf-side-panel">
        <h3 className="pdf-side-title">Convert</h3>
        <p className="pdf-side-hint">Add a file to get started.</p>
      </aside>
    );
  }

  return (
    <aside className="pdf-side-panel">
      <h3 className="pdf-side-title">Convert</h3>

      <dl className="pdf-side-stats">
        <div>
          <dt>Type</dt>
          <dd>{category ? String(category) : '…'}</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{formatByteSize(job.source.size) || '—'}</dd>
        </div>
      </dl>

      {sourceIsVideo && extractOps.length > 0 && !done && (
        <div className="pdf-side-section">
          <div className="pdf-view-toggle" role="group" aria-label="Conversion mode">
            <button
              type="button"
              className={videoMode === 'convert' ? 'is-active' : ''}
              disabled={busy}
              onClick={() => switchVideoMode('convert')}
            >
              Convert video
            </button>
            <button
              type="button"
              className={videoMode === 'extract' ? 'is-active' : ''}
              disabled={busy}
              onClick={() => switchVideoMode('extract')}
            >
              Extract audio
            </button>
          </div>
        </div>
      )}

      {!done && (
        <div className="pdf-side-section">
          <label className="pdf-side-field">
            Convert to
            <select
              value={operations.some((op) => op.id === job.operationId) ? (job.operationId ?? '') : ''}
              onChange={(e) => onSetOperation(e.target.value)}
              disabled={busy || operations.length === 0}
            >
              {operations.length === 0 && <option value="">Detecting…</option>}
              {operations.map((op) => (
                <option key={op.id} value={op.id}>
                  {formatOptionLabel(op)}
                </option>
              ))}
            </select>
          </label>
          {sourceIsVideo && videoMode === 'extract' && (
            <p className="pdf-side-hint">Pulls the audio track into a standalone audio file.</p>
          )}
        </div>
      )}

      {!done && (
        <div className="pdf-side-section">
          <label className="pdf-export-name-field">
            Output name
            <div className="pdf-export-name-input">
              <input
                type="text"
                value={outputStem}
                disabled={busy}
                onChange={(e) => onOutputStemChange(e.target.value)}
                placeholder="filename"
              />
              <span>.{selectedOp?.extension || 'out'}</span>
            </div>
          </label>
          <p className="pdf-side-hint">Downloads as {predictedName}</p>
        </div>
      )}

      {!done && destructiveWarnings.length > 0 && (
        <div className="pdf-side-section">
          <h4>Confirm before converting</h4>
          <div className="converter-ack-list">
            {destructiveWarnings.map((warning) => (
              <AppCheckbox
                key={warning.code}
                checked={acknowledgments[job.id]?.[warning.code] === true}
                disabled={busy}
                onChange={(e) => onAcknowledge(warning.code, e.target.checked)}
              >
                {warning.message}
              </AppCheckbox>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="pdf-side-section">
          <p className="pdf-side-hint">Ready · {job.output?.fileName}</p>
        </div>
      )}

      {job.status === JOB_STATUS.FAILED && job.error?.message && (
        <p className="pdf-side-error" role="alert">{job.error.message}</p>
      )}
    </aside>
  );
}
