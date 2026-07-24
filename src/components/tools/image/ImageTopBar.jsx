import { useEffect, useRef } from 'react';
import { SquareSplitHorizontal, Redo2, Undo2, Download, Upload, RotateCcw } from 'lucide-react';
import { sanitizeDisplayNameInput, formatTitleMetaLine } from '@/lib/tools/shared/display-filename.js';

/**
 * @param {object} props
 */
export default function ImageTopBar({
  title,
  onTitleChange,
  dims,
  size,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  comparing,
  onCompareDown,
  onCompareUp,
  onCompareToggle,
  onAddFiles,
  accept,
  onReset,
  onDownload,
}) {
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const metaLine = formatTitleMetaLine([dims, size]);

  useEffect(() => {
    // no-op placeholder for focus management
  }, []);

  return (
    <header className="tools-image-topbar">
      <div className="tools-image-topbar-left">
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Undo2 size={15} />
        </button>
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onRedo} disabled={!canRedo} aria-label="Redo">
          <Redo2 size={15} />
        </button>
        <button
          type="button"
          className={`pdf-btn pdf-btn--ghost pdf-btn--sm tools-image-compare-btn${comparing ? ' is-active' : ''}`}
          onPointerDown={onCompareDown}
          onPointerUp={onCompareUp}
          onPointerLeave={onCompareUp}
          onClick={onCompareToggle}
          aria-pressed={comparing}
          aria-label="Compare with original"
        >
          <SquareSplitHorizontal size={15} />
          Compare
        </button>
      </div>

      <div className="tools-image-topbar-center">
        <input
          className="tools-image-title-input"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(sanitizeDisplayNameInput(e.target.value))}
          aria-label="Image title"
          spellCheck={false}
        />
        {metaLine ? (
          <span className="tools-image-meta" aria-label="Image details">{metaLine}</span>
        ) : null}
      </div>

      <div className="tools-image-topbar-right">
        <button
          type="button"
          className="pdf-btn pdf-btn--secondary pdf-btn--sm"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={14} />
          Add files
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          multiple
          hidden
          onChange={(e) => {
            const files = e.target.files ? [...e.target.files] : [];
            e.target.value = '';
            if (files.length) onAddFiles(files);
          }}
        />
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onReset}>
          <RotateCcw size={14} />
          Reset
        </button>
        <button type="button" className="pdf-btn pdf-btn--primary pdf-btn--sm" onClick={onDownload}>
          <Download size={14} />
          Download
        </button>
      </div>
    </header>
  );
}
