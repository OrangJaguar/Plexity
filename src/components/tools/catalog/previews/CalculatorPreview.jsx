export default function CalculatorPreview() {
  return (
    <div className="tools-preview-scale tools-calculator-preview-v2">
      <div className="tools-calculator-preview-v2-layout">
        <div className="tools-calculator-preview-v2-panel">
          <div className="tools-calculator-preview-v2-toolbar" />
          <div className="tools-calculator-preview-v2-row">
            <span className="dot" />
            <span className="expr">sin x</span>
          </div>
          <div className="tools-calculator-preview-v2-row muted">
            <span className="dot dim" />
            <span className="expr placeholder" />
          </div>
        </div>
        <div className="tools-calculator-preview-v2-graph">
          <svg viewBox="0 0 160 100" aria-hidden>
            <defs>
              <pattern id="calcPrevGrid" width="16" height="16" patternUnits="userSpaceOnUse">
                <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.15" />
              </pattern>
            </defs>
            <rect width="160" height="100" fill="url(#calcPrevGrid)" />
            <line x1="0" y1="50" x2="160" y2="50" stroke="currentColor" strokeWidth="1" opacity="0.35" />
            <line x1="80" y1="0" x2="80" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.35" />
            <path d="M0 50 C20 10,40 90,60 50 S100 10,160 50" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
