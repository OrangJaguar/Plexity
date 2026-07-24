import { useRef } from 'react';
import { Redo2, Undo2, Upload, RotateCcw, Download } from 'lucide-react';
import { VIDEO_ASPECT_PRESETS } from '@/lib/tools/video/video-limits.js';
import { sanitizeDisplayNameInput } from '@/lib/tools/shared/display-filename.js';

/**
 * @param {object} props
 */
export default function VideoTopBar({
  title,
  onTitleChange,
  aspectId,
  onAspectChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddFiles,
  accept,
  onReset,
  onExport,
  disabledExport,
}) {
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  return (
    <header className="tools-video-topbar">
      <div className="tools-video-topbar-left">
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)">
          <Undo2 size={15} />
        </button>
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">
          <Redo2 size={15} />
        </button>
        <label className="tools-video-aspect" title="Preview and export frame size">
          <span className="sr-only">Aspect ratio</span>
          <select
            value={aspectId}
            onChange={(e) => onAspectChange(e.target.value)}
            aria-label="Aspect ratio"
          >
            {VIDEO_ASPECT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="tools-video-topbar-center">
        <input
          className="tools-video-title-input"
          type="text"
          value={title}
          onChange={(e) => onTitleChange(sanitizeDisplayNameInput(e.target.value))}
          aria-label="Project title"
          spellCheck={false}
        />
      </div>

      <div className="tools-video-topbar-right">
        <button
          type="button"
          className="pdf-btn pdf-btn--secondary pdf-btn--sm"
          onClick={() => fileRef.current?.click()}
          title="Import video, audio, or images into the media bin"
        >
          <Upload size={14} />
          Add media
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
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onReset} aria-label="Reset project" title="Clear project and start over">
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          className="pdf-btn pdf-btn--primary pdf-btn--sm"
          onClick={onExport}
          disabled={disabledExport}
          title="Export your video"
        >
          <Download size={14} />
          Export
        </button>
      </div>
    </header>
  );
}
