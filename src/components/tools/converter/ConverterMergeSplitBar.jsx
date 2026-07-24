import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Layers, Scissors } from 'lucide-react';
import { validateMergeCompatibility } from '@/lib/tools/converter/merge-plan.js';
import {
  createSplitSpec,
  estimateSplitCount,
  validateSplitSpec,
} from '@/lib/tools/converter/split-plan.js';
import { jobToSourceAnalysis } from '@/lib/tools/converter/workspace/batch-selection.js';

/**
 * @param {object} props
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} props.selectedJobs
 * @param {(orderedIds: string[]) => void} props.onMerge
 * @param {(spec: import('@/lib/tools/converter/split-plan.js').SplitSpec) => void} props.onSplit
 * @param {boolean} [props.disabled]
 */
export default function ConverterMergeSplitBar({
  selectedJobs,
  onMerge,
  onSplit,
  disabled = false,
}) {
  const [orderedIds, setOrderedIds] = useState(() => selectedJobs.map((job) => job.id));
  const [splitMode, setSplitMode] = useState(/** @type {'duration' | 'size' | 'count'} */('duration'));
  const [splitValue, setSplitValue] = useState(30);

  const effectiveOrder = useMemo(() => {
    const selectedSet = new Set(selectedJobs.map((job) => job.id));
    const preserved = orderedIds.filter((id) => selectedSet.has(id));
    for (const job of selectedJobs) {
      if (!preserved.includes(job.id)) preserved.push(job.id);
    }
    return preserved;
  }, [orderedIds, selectedJobs]);

  const mergeSources = useMemo(
    () => effectiveOrder
      .map((id) => selectedJobs.find((job) => job.id === id))
      .filter(Boolean)
      .map((job) => jobToSourceAnalysis(/** @type {NonNullable<typeof job>} */ (job)))
      .filter(Boolean),
    [effectiveOrder, selectedJobs],
  );

  const mergeValidation = useMemo(
    () => validateMergeCompatibility(mergeSources),
    [mergeSources],
  );

  const splitJob = selectedJobs.length === 1 ? selectedJobs[0] : null;
  const splitPreview = useMemo(() => {
    if (!splitJob) return null;
    const spec = createSplitSpec({ mode: splitMode, value: splitValue });
    const validated = validateSplitSpec(spec);
    if (!validated.ok) return validated;
    return estimateSplitCount({
      spec: validated.spec,
      durationSec: Number(splitJob.analysis?.durationSec ?? 0) || null,
      sourceBytes: splitJob.source.size,
    });
  }, [splitJob, splitMode, splitValue]);

  const move = (index, direction) => {
    const next = [...effectiveOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrderedIds(next);
  };

  if (selectedJobs.length < 1) return null;

  return (
    <section className="tools-converter-structure" aria-labelledby="converter-structure-heading">
      <div className="tools-converter-structure-header">
        <Layers size={18} aria-hidden />
        <h2 id="converter-structure-heading">Merge &amp; split</h2>
      </div>

      {selectedJobs.length >= 2 && (
        <div className="tools-converter-merge">
          <h3>Merge selected ({selectedJobs.length})</h3>
          {!mergeValidation.ok && (
            <p className="tools-converter-structure-error" role="alert">
              {mergeValidation.message}
            </p>
          )}
          <ol className="tools-converter-merge-order" aria-label="Merge order">
            {effectiveOrder.map((id, index) => {
              const job = selectedJobs.find((entry) => entry.id === id);
              if (!job) return null;
              return (
                <li key={id} className="tools-converter-merge-item">
                  <span>{job.source.name}</span>
                  <span className="tools-converter-merge-actions">
                    <button
                      type="button"
                      className="tools-converter-btn tools-converter-btn--ghost"
                      disabled={disabled || index === 0}
                      aria-label={`Move ${job.source.name} up`}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={14} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="tools-converter-btn tools-converter-btn--ghost"
                      disabled={disabled || index === effectiveOrder.length - 1}
                      aria-label={`Move ${job.source.name} down`}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={14} aria-hidden />
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
          <button
            type="button"
            className="tools-converter-btn tools-converter-btn--primary"
            disabled={disabled || !mergeValidation.ok}
            onClick={() => onMerge(effectiveOrder)}
          >
            Merge in this order
          </button>
        </div>
      )}

      {splitJob && (
        <div className="tools-converter-split">
          <h3>
            <Scissors size={16} aria-hidden />
            Split {splitJob.source.name}
          </h3>
          <div className="tools-converter-split-controls">
            <label className="tools-converter-field">
              <span>Mode</span>
              <select
                value={splitMode}
                disabled={disabled}
                onChange={(event) => setSplitMode(/** @type {'duration' | 'size' | 'count'} */ (event.target.value))}
              >
                <option value="duration">By duration (seconds)</option>
                <option value="size">By size (bytes)</option>
                <option value="count">By segment count</option>
              </select>
            </label>
            <label className="tools-converter-field">
              <span>Value</span>
              <input
                type="number"
                min={1}
                value={splitValue}
                disabled={disabled}
                onChange={(event) => setSplitValue(Number(event.target.value))}
              />
            </label>
          </div>
          {splitPreview && !splitPreview.ok && (
            <p className="tools-converter-structure-error" role="alert">{splitPreview.message}</p>
          )}
          {splitPreview && splitPreview.ok && (
            <p className="tools-converter-split-preview">
              Estimated segments: {splitPreview.count}
            </p>
          )}
          <button
            type="button"
            className="tools-converter-btn"
            disabled={disabled || !splitPreview?.ok}
            onClick={() => {
              const spec = createSplitSpec({ mode: splitMode, value: splitValue });
              const validated = validateSplitSpec(spec);
              if (validated.ok) onSplit(validated.spec);
            }}
          >
            Apply split plan
          </button>
        </div>
      )}
    </section>
  );
}
