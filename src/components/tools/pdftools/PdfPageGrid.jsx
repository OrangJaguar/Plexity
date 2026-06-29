import { useState } from 'react';
import { RotateCcw, RotateCw } from 'lucide-react';

/**
 * @param {{
 *   pages: Array<{ key: string, thumb: string|null, rotation: number, pageIndex: number }>,
 *   pageOrder: string[],
 *   selected: Set<string>,
 *   onToggle: (key: string) => void,
 *   onReorder?: (from: number, to: number) => void,
 *   selectionMode?: 'none'|'select'|'remove'|'extract',
 *   markedKeys?: Set<string>,
 *   showRotate?: boolean,
 *   onRotate?: (delta: number) => void,
 *   groupByFile?: { fileId: string, name: string, pageKeys: string[] }[],
 * }} props
 */
export default function PdfPageGrid({
  pages,
  pageOrder,
  selected,
  onToggle,
  onReorder,
  selectionMode = 'none',
  markedKeys,
  showRotate = false,
  onRotate,
  groupByFile,
}) {
  const [dragIndex, setDragIndex] = useState(null);
  const pageMap = Object.fromEntries(pages.map((p) => [p.key, p]));

  const renderThumb = (key, index) => {
    const page = pageMap[key];
    if (!page) return null;
    const isSelected = selected.has(key);
    const isMarked = markedKeys?.has(key);
    const selectable = selectionMode !== 'none';

    return (
      <div
        key={key}
        className={[
          'pdf-page-thumb',
          selectable && isSelected && 'pdf-page-thumb--selected',
          selectionMode === 'remove' && isMarked && 'pdf-page-thumb--marked-remove',
          selectionMode === 'extract' && isMarked && 'pdf-page-thumb--marked-extract',
          dragIndex === index && 'pdf-page-thumb--dragging',
        ].filter(Boolean).join(' ')}
        draggable={!!onReorder}
        onDragStart={() => setDragIndex(index)}
        onDragEnd={() => setDragIndex(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          if (dragIndex != null && dragIndex !== index && onReorder) {
            onReorder(dragIndex, index);
          }
          setDragIndex(null);
        }}
        onClick={() => selectable && onToggle(key)}
        role={selectable ? 'button' : undefined}
        tabIndex={selectable ? 0 : undefined}
        onKeyDown={(e) => {
          if (selectable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggle(key);
          }
        }}
      >
        <div className="pdf-page-thumb-img-wrap">
          {page.thumb ? (
            <img src={page.thumb} alt="" className="pdf-page-thumb-img" />
          ) : (
            <div className="pdf-page-thumb-placeholder" />
          )}
        </div>
        <span className="pdf-page-thumb-num">{page.pageIndex + 1}</span>
      </div>
    );
  };

  if (groupByFile?.length) {
    return (
      <div className="pdf-page-grid pdf-page-grid--grouped">
        {groupByFile.map((group) => (
          <section key={group.fileId} className="pdf-file-group">
            <h4 className="pdf-file-group-name">{group.name}</h4>
            <div className="pdf-page-grid-row">
              {group.pageKeys.map((key) => {
                const globalIndex = pageOrder.indexOf(key);
                return renderThumb(key, globalIndex);
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="pdf-page-grid">
      {showRotate && onRotate && (
        <div className="pdf-page-grid-toolbar">
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onRotate(-90)}>
            <RotateCcw size={14} /> Rotate left
          </button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onRotate(90)}>
            <RotateCw size={14} /> Rotate right
          </button>
        </div>
      )}
      <div className="pdf-page-grid-row">
        {pageOrder.map((key, index) => renderThumb(key, index))}
      </div>
    </div>
  );
}
