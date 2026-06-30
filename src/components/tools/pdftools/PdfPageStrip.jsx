import { useState } from 'react';
import {
  Copy, RotateCcw, RotateCw, Scissors, Trash2,
} from 'lucide-react';

/**
 * @param {{
 *   pages: Array<{ key: string, thumb: string|null, thumbFailed?: boolean, rotation: number, pageIndex: number, fileId: string }>,
 *   pageOrder: string[],
 *   splitBreaks: Set<string>,
 *   onToggleSplit: (pageKey: string) => void,
 *   onReorder: (from: number, to: number) => void,
 *   onDelete: (key: string) => void,
 *   onExtract: (key: string) => void,
 *   onRotate: (key: string, delta: number) => void,
 *   onOpenExpanded: (key: string) => void,
 *   groupByFile?: { fileId: string, name: string, pageKeys: string[] }[],
 * }} props
 */
export default function PdfPageStrip({
  pages,
  pageOrder,
  splitBreaks,
  onToggleSplit,
  onReorder,
  onDelete,
  onExtract,
  onRotate,
  onOpenExpanded,
  onRetryThumb,
  groupByFile,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const pageMap = Object.fromEntries(pages.map((p) => [p.key, p]));

  const renderSplitDivider = (afterPageKey) => {
    const active = splitBreaks.has(afterPageKey);
    return (
      <button
        type="button"
        className={`pdf-split-divider${active ? ' pdf-split-divider--active' : ''}`}
        onClick={() => onToggleSplit(afterPageKey)}
        title={active ? 'Remove split' : 'Split here'}
        aria-label={active ? 'Remove split' : 'Split here'}
      >
        <Scissors size={12} />
        {active && <span>Split</span>}
      </button>
    );
  };

  const renderThumb = (key, globalIndex) => {
    const page = pageMap[key];
    if (!page) return null;

    return (
      <div
        className={[
          'pdf-page-thumb',
          dragIndex === globalIndex && 'pdf-page-thumb--dragging',
        ].filter(Boolean).join(' ')}
        draggable
        onDragStart={() => setDragIndex(globalIndex)}
        onDragEnd={() => setDragIndex(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (dragIndex != null && dragIndex !== globalIndex) onReorder(dragIndex, globalIndex);
          setDragIndex(null);
        }}
      >
        <div
          className="pdf-page-thumb-img-wrap"
          role="presentation"
        >
          {page.thumb ? (
            <button type="button" className="pdf-page-thumb-open" onClick={() => onOpenExpanded(key)}>
              <img src={page.thumb} alt="" className="pdf-page-thumb-img" style={{ transform: `rotate(${page.rotation}deg)` }} />
            </button>
          ) : page.thumbFailed ? (
            <button
              type="button"
              className="pdf-page-thumb-placeholder pdf-page-thumb-placeholder--error"
              onClick={() => onRetryThumb?.(key)}
              title={page.thumbError || 'Preview unavailable'}
            >
              Preview unavailable — tap to retry
            </button>
          ) : (
            <div className="pdf-page-thumb-placeholder pdf-page-thumb-placeholder--loading" aria-busy="true">
              <span className="pdf-page-thumb-loading-label">Loading…</span>
            </div>
          )}
        </div>
        <div className="pdf-page-thumb-footer">
          <span className="pdf-page-thumb-num">{globalIndex + 1}</span>
          <div className="pdf-page-thumb-actions">
            <button type="button" className="pdf-icon-btn" title="Rotate left" onClick={() => onRotate(key, -90)}>
              <RotateCcw size={12} />
            </button>
            <button type="button" className="pdf-icon-btn" title="Rotate right" onClick={() => onRotate(key, 90)}>
              <RotateCw size={12} />
            </button>
            <button type="button" className="pdf-icon-btn" title="Extract page" onClick={() => onExtract(key)}>
              <Copy size={12} />
            </button>
            <button type="button" className="pdf-icon-btn pdf-icon-btn--danger" title="Delete page" onClick={() => onDelete(key)}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  let lastFileId = null;

  return (
    <div className={`pdf-page-strip${groupByFile?.length ? ' pdf-page-strip--grouped' : ''}`}>
      <div className="pdf-page-strip-row">
        {pageOrder.map((key, globalIndex) => {
          const page = pageMap[key];
          const showHeader = groupByFile?.length && page && page.fileId !== lastFileId;
          if (page) lastFileId = page.fileId;
          const fileName = groupByFile?.find((g) => g.fileId === page?.fileId)?.name;

          return (
            <div key={key} className="pdf-page-strip-group-wrap">
              {showHeader && fileName && (
                <h4 className="pdf-file-group-name pdf-file-group-name--inline">{fileName}</h4>
              )}
              <div className="pdf-page-strip-item">
                {renderThumb(key, globalIndex)}
                {globalIndex < pageOrder.length - 1 && renderSplitDivider(key)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
