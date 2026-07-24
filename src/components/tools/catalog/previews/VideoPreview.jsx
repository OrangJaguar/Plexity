export default function VideoPreview() {
  return (
    <div className="tools-preview-scale">
      <div className="tools-preview-coming-soon-frame">
        <header className="tools-preview-coming-soon-head">
          <strong>Project · Chem lab demo</strong>
        </header>
        <div className="tools-preview-coming-soon-stage tools-preview-video-stage">
          <div className="tools-preview-video-screen" />
          <div className="tools-preview-timeline">
            <span className="tools-preview-timeline-clip" style={{ width: '42%' }} />
            <span className="tools-preview-timeline-clip muted" style={{ width: '28%' }} />
            <span className="tools-preview-timeline-clip" style={{ width: '18%' }} />
          </div>
          <div className="tools-preview-coming-soon-actions">
            <span className="tools-preview-pill">Trim</span>
            <span className="tools-preview-pill">Split</span>
            <span className="tools-preview-pill">Export</span>
          </div>
        </div>
      </div>
    </div>
  );
}
