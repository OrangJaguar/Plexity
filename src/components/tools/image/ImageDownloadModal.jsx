import { useState } from 'react';

/**
 * @param {{ open: boolean, onClose: () => void, onDownload: (opts: object) => void }} props
 */
export default function ImageDownloadModal({ open, onClose, onDownload }) {
  const [format, setFormat] = useState(/** @type {'png'|'jpeg'|'webp'} */ ('png'));
  const [quality, setQuality] = useState(0.92);
  const [maxEdge, setMaxEdge] = useState('');

  if (!open) return null;

  return (
    <div className="tools-image-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tools-image-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-download-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="image-download-title">Download</h2>
        <label className="tools-image-field-block">
          <span className="tools-image-field-label">Format</span>
          <select
            className="tools-settings-input"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
          >
            <option value="png">PNG (keeps transparency)</option>
            <option value="webp">WebP</option>
            <option value="jpeg">JPEG (flattens on white)</option>
          </select>
        </label>
        {format !== 'png' ? (
          <div className="tools-image-field-block">
            <span className="tools-image-field-label">Quality</span>
            <div className="tools-image-slider-row">
              <input
                type="range"
                min={50}
                max={100}
                value={Math.round(quality * 100)}
                onChange={(e) => setQuality(Number(e.target.value) / 100)}
              />
              <span className="tools-image-num-readonly">{Math.round(quality * 100)}</span>
            </div>
          </div>
        ) : null}
        <label className="tools-image-field-block">
          <span className="tools-image-field-label">Max long edge (optional)</span>
          <input
            className="tools-settings-input"
            type="number"
            placeholder="e.g. 2048"
            value={maxEdge}
            onChange={(e) => setMaxEdge(e.target.value)}
          />
        </label>
        <div className="tools-image-modal-actions">
          <button type="button" className="pdf-btn pdf-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="pdf-btn pdf-btn--primary"
            onClick={() => onDownload({
              format,
              quality,
              maxEdge: maxEdge ? Number(maxEdge) : undefined,
            })}
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
