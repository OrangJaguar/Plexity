import { useMemo, useState } from 'react';
import { listPresets } from '@/lib/tools/converter/converter-presets.js';
import { listOperationsForInputFormat } from '@/lib/tools/converter/conversion-capabilities.js';
import { countPresetApplicableJobs } from '@/components/tools/converter/converter-ui-utils';

const FALLBACK_TARGETS = Object.freeze(['png', 'jpeg', 'webp', 'mp3', 'wav', 'mp4', 'webm', 'json', 'csv']);

/**
 * @param {object} props
 * @param {ReadonlyArray<import('@/lib/tools/converter/converter-job-model.js').ConverterJob>} props.jobs
 * @param {import('@/lib/tools/converter/converter-limits.js').DeviceProfile} props.deviceProfile
 * @param {(presetId: string, options?: Record<string, unknown>) => void} props.onApplyPreset
 * @param {boolean} [props.disabled]
 */
export default function ConverterPresetPicker({ jobs, deviceProfile, onApplyPreset, disabled = false }) {
  const presets = listPresets();
  const [targetFormat, setTargetFormat] = useState('webp');

  const targetOptions = useMemo(() => {
    const formats = new Set(FALLBACK_TARGETS);
    for (const job of jobs) {
      const format = job.source.detectedFormat ?? job.analysis?.format;
      if (!format) continue;
      for (const op of listOperationsForInputFormat(format)) {
        if (op.outputFormat) formats.add(op.outputFormat);
      }
    }
    return [...formats].sort();
  }, [jobs]);

  return (
    <section className="tools-converter-presets" aria-labelledby="converter-presets-heading">
      <div className="tools-converter-presets-header">
        <h2 id="converter-presets-heading">Conversion goals</h2>
        <p>Pick a goal to apply to selected files in the queue.</p>
      </div>

      <label className="tools-converter-preset-target">
        <span>Change-format target</span>
        <select
          value={targetFormat}
          disabled={disabled}
          onChange={(event) => setTargetFormat(event.target.value)}
          aria-label="Target format for Change format preset"
        >
          {targetOptions.map((format) => (
            <option key={format} value={format}>
              {format.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <div className="tools-converter-preset-grid" role="list">
        {presets.map((preset) => {
          const applicableCount = countPresetApplicableJobs(jobs, preset.id, deviceProfile);
          const needsTarget = preset.id === 'change-format';
          const isDisabled = disabled || applicableCount === 0 || (needsTarget && !targetFormat);

          return (
            <button
              key={preset.id}
              type="button"
              role="listitem"
              className="tools-converter-preset-card"
              disabled={isDisabled}
              aria-disabled={isDisabled}
              onClick={() => onApplyPreset(
                preset.id,
                needsTarget ? { targetFormat } : undefined,
              )}
            >
              <span className="tools-converter-preset-label">{preset.label}</span>
              <span className="tools-converter-preset-description">{preset.description}</span>
              <span className="tools-converter-preset-meta">
                {applicableCount > 0
                  ? `${applicableCount} file${applicableCount === 1 ? '' : 's'} ready`
                  : 'No matching files'}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
