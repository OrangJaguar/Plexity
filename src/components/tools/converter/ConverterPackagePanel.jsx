/**
 * Server package panel — create/poll/download ZIP (Plan 6).
 */
export default function ConverterPackagePanel({
  packageHook,
  readyCount,
  selectedCount,
}) {
  const {
    options,
    updateOption,
    pkg,
    busy,
    error,
    warning,
    statusMessage,
    createPackage,
    downloadPackage,
  } = packageHook;

  return (
    <div className="tools-converter-package-panel" role="region" aria-labelledby="package-panel-heading">
      <h3 id="package-panel-heading">Server package (ZIP)</h3>
      <p className="tools-converter-muted">
        Ready {readyCount} of {selectedCount}. Packages expire after about an hour.
        Large ZIPs may be awkward on mobile — prefer individual downloads when warned.
      </p>

      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={options.includeThumbnails}
          onChange={(e) => updateOption('includeThumbnails', e.target.checked)}
          disabled={busy}
        />
        Include thumbnails
      </label>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={options.includeSubtitles}
          onChange={(e) => updateOption('includeSubtitles', e.target.checked)}
          disabled={busy}
        />
        Include subtitles
      </label>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={options.includeMetadata}
          onChange={(e) => updateOption('includeMetadata', e.target.checked)}
          disabled={busy}
        />
        Include metadata sidecars
      </label>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={options.includeAiTranscripts}
          onChange={(e) => updateOption('includeAiTranscripts', e.target.checked)}
          disabled={busy}
        />
        Include AI transcripts
      </label>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={options.includeAiOcr}
          onChange={(e) => updateOption('includeAiOcr', e.target.checked)}
          disabled={busy}
        />
        Include AI OCR text
      </label>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={options.includeAiAltText}
          onChange={(e) => updateOption('includeAiAltText', e.target.checked)}
          disabled={busy}
        />
        Include AI alt-text
      </label>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={options.readySubsetOnly}
          onChange={(e) => updateOption('readySubsetOnly', e.target.checked)}
          disabled={busy}
        />
        Package ready subset only (allow partial)
      </label>

      {warning && (
        <p className="tools-converter-error" role="status">
          Package may be large for this device ({warning}).
        </p>
      )}
      {error && <p className="tools-converter-error" role="alert">{error}</p>}
      {statusMessage && <p className="tools-converter-live" aria-live="polite">{statusMessage}</p>}
      {pkg && (
        <p className="tools-converter-muted">
          Package {pkg.status}
          {pkg.entryCount != null ? ` · ${pkg.entryCount} entries` : ''}
          {pkg.sizeBucket ? ` · ${pkg.sizeBucket}` : ''}
        </p>
      )}

      <div className="tools-converter-url-actions">
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn-primary"
          disabled={busy || readyCount <= 0}
          onClick={() => void createPackage()}
        >
          Create package
        </button>
        {pkg?.status === 'ready' && (
          <button
            type="button"
            className="tools-converter-btn"
            disabled={busy}
            onClick={() => void downloadPackage()}
          >
            Download ZIP
          </button>
        )}
      </div>
    </div>
  );
}
