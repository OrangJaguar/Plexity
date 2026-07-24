import { formatWarning } from '@/lib/tools/converter/converter-warnings.js';
import { buildSourceInspectorRows } from '@/components/tools/converter/converter-ui-utils';

/**
 * @param {object} props
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterSourceDescriptor} props.source
 * @param {Record<string, unknown> | null | undefined} props.analysis
 */
export default function ConverterSourceInspector({ source, analysis }) {
  const rows = buildSourceInspectorRows(analysis, source);
  const warnings = [
    ...(source.warnings ?? []),
    ...(analysis?.warnings ?? []),
  ];

  if (!rows.length && !warnings.length) {
    return null;
  }

  return (
    <section className="tools-converter-inspector" aria-label="Source details">
      {rows.length > 0 && (
        <dl className="tools-converter-inspector-grid">
          {rows.map((row) => (
            <div key={row.label} className="tools-converter-inspector-row">
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {warnings.length > 0 && (
        <ul className="tools-converter-inspector-warnings">
          {warnings.map((code) => {
            const warning = formatWarning(code);
            return (
              <li key={code} data-severity={warning.severity}>
                {warning.message}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
