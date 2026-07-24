import {
  encoderOptionsFromSizeBias,
  estimateOutputSize,
} from '@/lib/tools/converter/output-estimate.js';
import { getOperationById } from '@/lib/tools/converter/conversion-capabilities.js';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';
import { formatByteSize } from '@/components/tools/converter/converter-ui-utils';

/**
 * Quality / size-bias panel (sits under the preview).
 *
 * @param {{
 *   job: import('@/lib/tools/converter/converter-job-model.js').ConverterJob | null,
 *   onSetOptions: (options: Record<string, unknown>) => void,
 * }} props
 */
export default function ConverterQualityPanel({ job, onSetOptions }) {
  if (!job) return null;

  const selectedOp = getOperationById(job.operationId ?? '');
  const category = String(job.analysis?.category ?? job.source.category ?? selectedOp?.category ?? '');
  const busy = job.status === JOB_STATUS.PROCESSING || job.status === JOB_STATUS.QUEUED;
  const done = job.status === JOB_STATUS.COMPLETED && Boolean(job.output);
  const isExtract = String(job.operationId ?? '').startsWith('extract-audio-');
  const durationSec = Number(job.analysis?.durationSec ?? 0) || null;

  const sizeBias = Number.isFinite(Number(job.options?.sizeBias))
    ? Number(job.options.sizeBias)
    : 0;

  const estimateCategory = isExtract ? 'audio' : category || selectedOp?.category || 'image';
  const estimate = selectedOp
    ? estimateOutputSize({
      category: /** @type {'image'|'audio'|'video'|'data'} */ (estimateCategory),
      sourceBytes: job.source.size,
      operation: selectedOp,
      options: { ...job.options, sizeBias },
      durationSec,
      sizeBias,
    })
    : null;

  const sizeLabel = (
    <span className="converter-quality-estimate" title="Approximate output size vs original">
      {formatByteSize(job.source.size)}
      <span aria-hidden="true"> → </span>
      {estimate ? formatByteSize(estimate.bytes) : '—'}
    </span>
  );

  const applyBias = (bias) => {
    onSetOptions(encoderOptionsFromSizeBias({
      category: estimateCategory,
      sizeBias: bias,
      sourceBytes: job.source.size,
      durationSec,
      width: Number(job.analysis?.width ?? 0) || null,
      height: Number(job.analysis?.height ?? 0) || null,
    }));
  };

  if (done) return null;

  if (category === 'data') {
    const pretty = job.options?.pretty !== false;
    return (
      <div className="converter-quality-panel">
        <div className="converter-quality-panel-row converter-quality-panel-row--data">
          <span className="converter-quality-label">Output</span>
          <div className="pdf-view-toggle" role="group" aria-label="Data output style">
            <button
              type="button"
              className={!pretty ? 'is-active' : ''}
              disabled={busy}
              onClick={() => onSetOptions({ pretty: false, sizeBias: -0.2 })}
            >
              Compact
            </button>
            <button
              type="button"
              className={pretty ? 'is-active' : ''}
              disabled={busy}
              onClick={() => onSetOptions({ pretty: true, sizeBias: 0 })}
            >
              Pretty
            </button>
          </div>
          {sizeLabel}
        </div>
      </div>
    );
  }

  const showBias = category === 'image'
    || category === 'video'
    || category === 'audio'
    || isExtract;

  if (!showBias) return null;

  let detailLabel = null;
  if (category === 'image') {
    const quality = Number(job.options?.quality);
    const scale = Number(job.options?.scale);
    const q = Number.isFinite(quality) ? quality : 0.92;
    detailLabel = scale > 1.001
      ? `${Math.round(q * 100)}% · ${scale.toFixed(2)}×`
      : `${Math.round(q * 100)}%`;
  } else if (category === 'video' && !isExtract) {
    detailLabel = `${Number(job.options?.fps) || 30} fps`;
  } else if (category === 'audio' || isExtract) {
    detailLabel = `${Number(job.options?.bitrateKbps) || 192} kbps`;
  }

  return (
    <div className="converter-quality-panel">
      <div className="converter-quality-panel-row">
        <label className="converter-quality-label" htmlFor={`converter-bias-${job.id}`}>
          Quality
        </label>
        <span className="converter-quality-end">Smaller</span>
        <input
          id={`converter-bias-${job.id}`}
          className="converter-quality-slider"
          type="range"
          min={-1}
          max={1}
          step={0.01}
          value={sizeBias}
          disabled={busy}
          onChange={(e) => applyBias(Number(e.target.value))}
        />
        <span className="converter-quality-end">Larger</span>
        {detailLabel && <span className="converter-quality-pct">{detailLabel}</span>}
        {sizeLabel}
      </div>
    </div>
  );
}
