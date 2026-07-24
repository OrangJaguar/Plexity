import { ArrowLeft } from 'lucide-react';

/**
 * Shared drill-in chrome: Back + title, footer Reset/Done.
 */
export function ImageToolPanelShell({ title, children, onBack, onReset, onDone }) {
  return (
    <div className="tools-image-tool-panel">
      <header className="tools-image-tool-panel-head">
        <button type="button" className="tools-image-tool-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} />
        </button>
        <h3>{title}</h3>
      </header>
      <div className="tools-image-tool-panel-body">{children}</div>
      <footer className="tools-image-tool-panel-foot">
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onReset}>
          Reset
        </button>
        <button type="button" className="pdf-btn pdf-btn--primary pdf-btn--sm" onClick={onDone}>
          Done
        </button>
      </footer>
    </div>
  );
}
