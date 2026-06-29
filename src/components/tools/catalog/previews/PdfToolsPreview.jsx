import { Download, LayoutGrid, Maximize2, RotateCcw, Search, Upload } from 'lucide-react';

const THUMBS = ['1', '2', '3', '4', '5', '6'];

export default function PdfToolsPreview() {
  return (
    <div className="tools-preview-scale tools-preview-pdf">
      <div className="pdf-editor pdf-editor--active tools-preview-pdf-editor">
        <header className="pdf-editor-header">
          <div>
            <h1 className="pdf-editor-title">PDF</h1>
            <p className="pdf-editor-subtitle">Merge, split, rearrange, and annotate PDFs</p>
          </div>
          <div className="pdf-editor-header-actions">
            <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" tabIndex={-1}>
              <Search size={14} /> Search
            </button>
            <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--sm" tabIndex={-1}>
              <Upload size={14} /> Add files
            </button>
            <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" tabIndex={-1}>
              <RotateCcw size={14} /> Reset
            </button>
            <button type="button" className="pdf-btn pdf-btn--primary pdf-btn--sm" tabIndex={-1}>
              <Download size={14} /> Download
            </button>
          </div>
        </header>
        <div className="pdf-editor-toolbar">
          <div className="pdf-view-toggle">
            <button type="button" className="pdf-view-toggle-btn is-active" tabIndex={-1}>
              <LayoutGrid size={14} /> Thumbnails
            </button>
            <button type="button" className="pdf-view-toggle-btn" tabIndex={-1}>
              <Maximize2 size={14} /> Large view
            </button>
          </div>
          <span className="pdf-editor-toolbar-hint">Drag pages to reorder · Click between pages to split</span>
        </div>
        <div className="pdf-editor-body pdf-editor-body--split tools-preview-pdf-body">
          <main className="pdf-preview-area">
            <div className="pdf-page-strip">
              <div className="pdf-page-strip-row">
                {THUMBS.map((n, i) => (
                  <div key={n} className="pdf-page-strip-item">
                    <div className={`pdf-page-thumb${i === 0 ? ' pdf-page-thumb--selected' : ''}`}>
                      <div className="pdf-page-thumb-img-wrap">
                        <div className="pdf-page-thumb-placeholder" />
                      </div>
                      <div className="pdf-page-thumb-footer">
                        <span>Page {n}</span>
                      </div>
                    </div>
                    {i < THUMBS.length - 1 && i === 2 && (
                      <div className="pdf-split-divider tools-preview-pdf-split" aria-hidden />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </main>
          <aside className="pdf-side-panel">
            <h2 className="pdf-side-title">Summary</h2>
            <p className="pdf-side-subtitle">lab-report.pdf · 6 pages</p>
            <div className="pdf-side-stats">
              <div><dt>Files</dt><dd>1</dd></div>
              <div><dt>Pages</dt><dd>6</dd></div>
              <div><dt>Marked</dt><dd>0</dd></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
