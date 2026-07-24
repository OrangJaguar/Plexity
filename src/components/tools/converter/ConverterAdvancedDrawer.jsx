import { useCallback, useId, useMemo, useRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { getOperationById } from '@/lib/tools/converter/conversion-capabilities.js';
import { formatWarning } from '@/lib/tools/converter/converter-warnings.js';
import {
  isValidFilenameTemplate,
  previewTemplate,
} from '@/lib/tools/converter/filename-templates.js';
import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';

const PLAN_METADATA_VALUES = Object.freeze(['preserve', 'strip', 'strip-gps']);
const CHECKSUM_VALUES = Object.freeze(['none', 'sha256']);

const ADVANCED_OPTION_KEYS = new Set([
  'quality',
  'bitrateKbps',
  'videoBitrateKbps',
  'audioBitrateKbps',
  'fps',
  'videoCodec',
  'audioCodec',
  'sampleRate',
  'channels',
  'metadataPolicy',
  'loudnessNormalize',
]);

/**
 * @param {object} props
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} props.job
 * @param {(options: Record<string, unknown>) => void} props.onChangeOptions
 * @param {(partialPlan: Record<string, unknown>) => void} props.onChangePlanFields
 * @param {Record<string, Record<string, boolean>>} props.acknowledgments
 * @param {(jobId: string, warningCode: string, acknowledged: boolean) => void} props.onAcknowledge
 * @param {boolean} [props.disabled]
 */
export default function ConverterAdvancedDrawer({
  job,
  onChangeOptions,
  onChangePlanFields,
  acknowledgments,
  onAcknowledge,
  disabled = false,
}) {
  const summaryRef = useRef(/** @type {HTMLButtonElement | null} */(null));
  const panelId = useId();
  const operation = getOperationById(job.operationId ?? '');
  const plan = job.plan;
  const isLocked = disabled
    || job.status === JOB_STATUS.PROCESSING
    || job.status === JOB_STATUS.QUEUED
    || Boolean(job.output);

  const optionFields = useMemo(
    () => (operation?.options ?? []).filter((field) => ADVANCED_OPTION_KEYS.has(field.key)),
    [operation],
  );

  const planWarnings = useMemo(() => {
    const codes = new Set([
      ...(plan?.warnings ?? []),
      ...(job.analysis?.warnings ?? []),
      ...(job.source.warnings ?? []),
    ]);
    return [...codes];
  }, [job.analysis?.warnings, job.source.warnings, plan?.warnings]);

  const metadataAckWarnings = useMemo(
    () => planWarnings.filter((code) => code === 'GPS_METADATA' || code === 'STRIP_METADATA'),
    [planWarnings],
  );

  const targetMb = plan?.targetBytes != null
    ? Math.round(Number(plan.targetBytes) / (1024 * 1024) * 10) / 10
    : '';

  const namingTemplate = plan?.namingTemplate ?? '';
  const templatePreview = namingTemplate && isValidFilenameTemplate(namingTemplate)
    ? previewTemplate(namingTemplate, {
      name: job.source.name.replace(/\.[^.]+$/, ''),
      format: job.analysis?.format ?? job.source.detectedFormat ?? 'bin',
      ext: operation?.outputFormat ?? 'bin',
    })
    : null;

  const handleClose = useCallback((event) => {
    const details = event.currentTarget;
    if (!details.open) {
      summaryRef.current?.focus();
    }
  }, []);

  if (!operation && !plan) return null;

  return (
    <details
      className="tools-converter-advanced-drawer"
      onToggle={handleClose}
    >
      <summary ref={summaryRef} className="tools-converter-advanced-drawer-summary">
        <SlidersHorizontal size={16} aria-hidden />
        Advanced settings
      </summary>
      <div id={panelId} className="tools-converter-advanced-drawer-panel">
        {optionFields.length > 0 && (
          <div className="tools-converter-advanced-options">
            {optionFields.map((field) => (
              <OptionField
                key={field.key}
                field={field}
                value={job.options?.[field.key]}
                disabled={isLocked}
                onChange={(value) => onChangeOptions({ [field.key]: value })}
              />
            ))}
          </div>
        )}

        <div className="tools-converter-advanced-plan">
          <label className="tools-converter-field">
            <span>Target size (MB, approximate)</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={targetMb}
              disabled={isLocked}
              onChange={(event) => {
                const raw = event.target.value;
                if (!raw) {
                  onChangePlanFields({ targetBytes: null });
                  return;
                }
                const mb = Number(raw);
                if (!Number.isFinite(mb) || mb <= 0) return;
                onChangePlanFields({ targetBytes: Math.round(mb * 1024 * 1024) });
              }}
            />
          </label>

          <label className="tools-converter-field">
            <span>Filename template</span>
            <input
              type="text"
              value={namingTemplate}
              placeholder="{name}.{ext}"
              disabled={isLocked}
              aria-invalid={namingTemplate ? !isValidFilenameTemplate(namingTemplate) : undefined}
              onChange={(event) => onChangePlanFields({ namingTemplate: event.target.value || null })}
            />
            {templatePreview && (
              <span className="tools-converter-advanced-template-preview">Preview: {templatePreview}</span>
            )}
          </label>

          <label className="tools-converter-field">
            <span>Metadata policy</span>
            <select
              value={plan?.metadataPolicy ?? 'preserve'}
              disabled={isLocked}
              onChange={(event) => onChangePlanFields({ metadataPolicy: event.target.value })}
            >
              {PLAN_METADATA_VALUES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>

          <label className="tools-converter-field">
            <span>Checksum</span>
            <select
              value={plan?.checksumPolicy ?? 'none'}
              disabled={isLocked}
              onChange={(event) => onChangePlanFields({ checksumPolicy: event.target.value })}
            >
              {CHECKSUM_VALUES.map((value) => (
                <option key={value} value={value}>{value === 'none' ? 'None' : 'SHA-256'}</option>
              ))}
            </select>
          </label>
        </div>

        {metadataAckWarnings.length > 0 && !job.output && (
          <fieldset className="tools-converter-acknowledgments tools-converter-advanced-acks">
            <legend>Metadata acknowledgments</legend>
            {metadataAckWarnings.map((code) => {
              const warning = formatWarning(code);
              return (
                <label key={code} className="tools-converter-field tools-converter-field--inline">
                  <input
                    type="checkbox"
                    checked={acknowledgments[job.id]?.[code] === true}
                    disabled={isLocked}
                    onChange={(event) => onAcknowledge(job.id, code, event.target.checked)}
                  />
                  <span>{warning.message}</span>
                </label>
              );
            })}
          </fieldset>
        )}
      </div>
    </details>
  );
}

/**
 * @param {object} props
 * @param {import('@/lib/tools/converter/conversion-capabilities.js').ConversionOptionField} props.field
 * @param {unknown} props.value
 * @param {boolean} props.disabled
 * @param {(value: unknown) => void} props.onChange
 */
function OptionField({ field, value, disabled, onChange }) {
  if (field.type === 'boolean') {
    return (
      <label className="tools-converter-field tools-converter-field--inline">
        <input
          type="checkbox"
          checked={Boolean(value ?? field.default)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{field.label}</span>
      </label>
    );
  }

  if (field.type === 'enum') {
    return (
      <label className="tools-converter-field">
        <span>{field.label}</span>
        <select
          value={String(value ?? field.defaultValue ?? '')}
          disabled={disabled}
          onChange={(event) => {
            const raw = event.target.value;
            const parsed = Number.isFinite(Number(raw)) ? Number(raw) : raw;
            onChange(parsed);
          }}
        >
          {(field.values ?? []).map((option) => (
            <option key={String(option)} value={String(option)}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="tools-converter-field">
      <span>{field.label}</span>
      <input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step}
        value={Number(value ?? field.defaultValue ?? 0)}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
