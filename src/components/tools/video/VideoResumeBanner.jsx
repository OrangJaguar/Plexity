/**
 * @param {object} props
 */
export default function VideoResumeBanner({ savedAt, onResume, onDiscard }) {
  const when = savedAt ? new Date(savedAt).toLocaleString() : 'earlier';
  return (
    <div className="tools-video-resume-banner" role="status">
      <p>Resume last project from {when}?</p>
      <div className="tools-video-resume-actions">
        <button type="button" className="pdf-btn pdf-btn--primary pdf-btn--sm" onClick={onResume}>
          Resume
        </button>
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}
