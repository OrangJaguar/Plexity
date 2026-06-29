import { ChevronDown, ChevronUp, Download, X } from 'lucide-react';

/**
 * @param {object} props
 */
export default function PdfSummaryPanel({
  files,
  orderedFiles,
  totalPages,
  splitPreview,
  splitAfterKeys,
  processing,
  error,
  exportName,
  onExportNameChange,
  partNames,
  onPartNameChange,
  onRemoveFile,
  onMoveFile,
  onDownloadMerged,
  onDownloadPart,
}) {
  return (
    <aside className="pdf-side-panel">
      <h3 className="pdf-side-title">Summary</h3>

      {error && <p className="pdf-side-error">{error}</p>}

      <dl className="pdf-side-stats">
        <div><dt>Files</dt><dd>{files.length}</dd></div>
        <div><dt>Pages</dt><dd>{totalPages}</dd></div>
        {splitAfterKeys.size > 0 && (
          <div><dt>Split points</dt><dd>{splitAfterKeys.size}</dd></div>
        )}
      </dl>

      <div className="pdf-side-section">
        <label className="pdf-export-name-field">
          Combined filename
          <div className="pdf-export-name-input">
            <input
              type="text"
              value={exportName}
              onChange={(e) => onExportNameChange(e.target.value)}
              placeholder="my-document"
            />
            <span>.pdf</span>
          </div>
        </label>
      </div>

      {orderedFiles.length > 0 && (
        <div className="pdf-side-section">
          <h4>Documents</h4>
          <p className="pdf-side-hint">Reorder files — your edits and splits are kept.</p>
          <ul className="pdf-file-order-list">
            {orderedFiles.map((file, i) => (
              <li key={file.id}>
                <span className="pdf-file-order-name" title={file.name}>{file.name}</span>
                <span className="pdf-file-order-meta">{file.pageCount} pg</span>
                <div className="pdf-file-order-actions">
                  <button type="button" className="pdf-icon-btn" disabled={i === 0} onClick={() => onMoveFile(i, i - 1)} aria-label="Move up">
                    <ChevronUp size={14} />
                  </button>
                  <button type="button" className="pdf-icon-btn" disabled={i === orderedFiles.length - 1} onClick={() => onMoveFile(i, i + 1)} aria-label="Move down">
                    <ChevronDown size={14} />
                  </button>
                  <button type="button" className="pdf-icon-btn" onClick={() => onRemoveFile(file.id)} aria-label="Remove file">
                    <X size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {splitPreview.length > 0 && (
        <div className="pdf-side-section">
          <h4>Split parts</h4>
          <p className="pdf-side-hint">Name and download each part.</p>
          <ul className="pdf-split-download-list">
            {splitPreview.map((r, i) => (
              <li key={i}>
                <div className="pdf-split-part-row">
                  <span className="pdf-split-part-meta">Part {i + 1} · pages {r.start}–{r.end}</span>
                  <div className="pdf-export-name-input pdf-export-name-input--sm">
                    <input
                      type="text"
                      value={partNames[i] || `part-${i + 1}`}
                      onChange={(e) => onPartNameChange(i, e.target.value)}
                    />
                    <span>.pdf</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="pdf-btn pdf-btn--secondary pdf-btn--sm"
                  disabled={processing}
                  onClick={() => onDownloadPart(i)}
                >
                  <Download size={12} /> Download
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pdf-side-actions">
        <button
          type="button"
          className="pdf-btn pdf-btn--primary pdf-btn--block"
          disabled={!totalPages || processing}
          onClick={onDownloadMerged}
        >
          {processing ? 'Processing…' : 'Download combined PDF'}
        </button>
      </div>
    </aside>
  );
}
