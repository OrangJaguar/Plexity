export default function ImagePreview() {
  return (
    <div className="tools-preview-scale tools-preview-coming-soon">
      <div className="tools-preview-coming-soon-frame">
        <header className="tools-preview-coming-soon-head">
          <strong>mountain.png · 1200 × 1800</strong>
          <span className="tools-preview-pill">Download</span>
        </header>
        <div className="tools-preview-coming-soon-stage tools-preview-image-stage">
          <aside className="tools-preview-image-tools">
            <span>Crop</span>
            <span>Eraser</span>
            <span>Filters</span>
            <span>Adjust</span>
            <span>Layers</span>
          </aside>
          <div className="tools-preview-image-canvas">
            <div className="tools-preview-image-crop" />
          </div>
        </div>
      </div>
    </div>
  );
}
