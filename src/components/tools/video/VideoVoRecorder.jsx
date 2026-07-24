import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

/**
 * @param {object} props
 */
export default function VideoVoRecorder({
  status,
  level,
  error,
  onStart,
  onStop,
  onCancel,
}) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (status !== 'recording') {
      setElapsed(0);
      return undefined;
    }
    startRef.current = Date.now();
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 200);
    return () => clearInterval(id);
  }, [status]);

  const secs = Math.floor(elapsed / 1000);

  return (
    <div className="tools-video-vo">
      <p className="tools-video-vo-hint">Record a voiceover at the playhead. Stays on this device.</p>
      {error ? <p className="tools-video-export-error">{error}</p> : null}
      {status === 'recording' ? (
        <>
          <div className="tools-video-vo-meter" aria-hidden>
            <div style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <p className="tools-video-vo-timer">{secs}s</p>
          <div className="tools-video-vo-actions">
            <button type="button" className="pdf-btn pdf-btn--primary pdf-btn--sm" onClick={() => void onStop()}>
              <Square size={12} />
              Stop
            </button>
            <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--sm" onClick={() => void onStart()}>
          <Mic size={14} />
          Record VO
        </button>
      )}
    </div>
  );
}
