import { useRef } from 'react';
import { Mic, Upload, Download, Plus } from 'lucide-react';

/**
 * @param {object} props
 */
export default function VideoCaptionsPanel({
  onAddCue,
  onImportSrt,
  onExportSrt,
  onDictate,
  dictateSupported,
  dictating,
}) {
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  return (
    <div className="tools-video-rail-section tools-video-captions-panel">
      <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--sm" onClick={onAddCue}>
        <Plus size={14} />
        Add caption
      </button>
      <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => fileRef.current?.click()}>
        <Upload size={14} />
        Import SRT
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".srt,text/plain"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          const reader = new FileReader();
          reader.onload = () => onImportSrt(String(reader.result || ''));
          reader.readAsText(f);
        }}
      />
      <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onExportSrt}>
        <Download size={14} />
        Export SRT
      </button>
      {dictateSupported ? (
        <button
          type="button"
          className="pdf-btn pdf-btn--ghost pdf-btn--sm"
          onClick={() => void onDictate()}
          disabled={dictating}
        >
          <Mic size={14} />
          {dictating ? 'Listening…' : 'Dictate caption'}
        </button>
      ) : (
        <p className="tools-video-inspector-hint">Dictate unavailable in this browser.</p>
      )}
    </div>
  );
}
