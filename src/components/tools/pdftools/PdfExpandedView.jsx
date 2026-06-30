import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Type, Highlighter, Pencil, Square, Eraser, PenLine, Undo2, Redo2,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import PdfEditablePage from '@/components/tools/pdftools/PdfEditablePage';

const TOOLS = [
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'highlight', icon: Highlighter, label: 'Highlight' },
  { id: 'draw', icon: Pencil, label: 'Draw' },
  { id: 'rect', icon: Square, label: 'Shape' },
  { id: 'whiteout', icon: Eraser, label: 'Whiteout' },
  { id: 'signature', icon: PenLine, label: 'Signature' },
];

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;
/** ~A4 width at 96dpi */
const PAGE_BASE_WIDTH = 794;

function clampZoom(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

/**
 * @param {{
 *   pageOrder: string[],
 *   pages: Array<{ key: string, fileId: string, pageIndex: number, rotation: number, thumb?: string|null }>,
 *   fileMap: Record<string, { data: Uint8Array }>,
 *   activePageKey: string|null,
 *   scrollToKey: string|null,
 *   onActiveChange: (key: string) => void,
 *   onScrollDone: () => void,
 *   annotations: Record<string, import('@/lib/tools/pdftools/pdf-operations').Annotation[]>,
 *   onAnnotationsChange: (key: string, anns: import('@/lib/tools/pdftools/pdf-operations').Annotation[]) => void,
 *   onPageLayout: (key: string, layout: import('@/lib/tools/pdftools/pdf-render').PageLayout) => void,
 * }} props
 */
export default function PdfExpandedView({
  pageOrder,
  pages,
  fileMap,
  activePageKey,
  scrollToKey,
  onActiveChange,
  onScrollDone,
  annotations,
  onAnnotationsChange,
  onPageLayout,
}) {
  const pageMap = useMemo(
    () => Object.fromEntries(pages.map((p) => [p.key, p])),
    [pages],
  );
  const activeKey = activePageKey && pageMap[activePageKey] ? activePageKey : pageOrder[0];
  const activeIndex = pageOrder.indexOf(activeKey);
  const activePage = pageMap[activeKey];
  const activeFile = activePage ? fileMap[activePage.fileId] : null;

  const [activeTool, setActiveTool] = useState('text');
  const [zoom, setZoom] = useState(1);
  const [histories, setHistories] = useState({});
  const [historyIndices, setHistoryIndices] = useState({});

  const renderWidth = Math.round(PAGE_BASE_WIDTH * zoom);

  const scrollToPage = useCallback((key) => {
    requestAnimationFrame(() => {
      document.getElementById(`pdf-page-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  useEffect(() => {
    const target = scrollToKey || activeKey;
    if (!target) return undefined;
    const t = setTimeout(() => {
      scrollToPage(target);
      onScrollDone?.();
    }, 50);
    return () => clearTimeout(t);
  }, [scrollToKey, activeKey, scrollToPage, onScrollDone]);

  const getHistory = (key) => histories[key] ?? [annotations[key] ?? []];
  const getHistoryIndex = (key) => historyIndices[key] ?? 0;

  const pushHistory = (key, next) => {
    const idx = getHistoryIndex(key);
    const h = getHistory(key);
    setHistories((prev) => ({ ...prev, [key]: [...h.slice(0, idx + 1), next] }));
    setHistoryIndices((prev) => ({ ...prev, [key]: idx + 1 }));
    onAnnotationsChange(key, next);
  };

  const undo = (key) => {
    const idx = getHistoryIndex(key);
    if (idx <= 0) return;
    const h = getHistory(key);
    setHistoryIndices((prev) => ({ ...prev, [key]: idx - 1 }));
    onAnnotationsChange(key, h[idx - 1]);
  };

  const redo = (key) => {
    const idx = getHistoryIndex(key);
    const h = getHistory(key);
    if (idx >= h.length - 1) return;
    setHistoryIndices((prev) => ({ ...prev, [key]: idx + 1 }));
    onAnnotationsChange(key, h[idx + 1]);
  };

  const handleLayout = useCallback((layout) => {
    if (activeKey) onPageLayout(activeKey, layout);
  }, [activeKey, onPageLayout]);

  return (
    <div className="pdf-expanded-view">
      <div className="pdf-expanded-toolbar-sticky">
        <div className="pdf-edit-toolbar pdf-edit-toolbar--expanded">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                className={`pdf-edit-tool${activeTool === t.id ? ' pdf-edit-tool--active' : ''}`}
                title={t.label}
                onClick={() => setActiveTool(t.id)}
              >
                <Icon size={16} />
                <span>{t.label}</span>
              </button>
            );
          })}
          <span className="pdf-edit-toolbar-spacer" />
          <button type="button" className="pdf-edit-tool" onClick={() => undo(activeKey)} disabled={getHistoryIndex(activeKey) <= 0}>
            <Undo2 size={16} /> Undo
          </button>
          <button type="button" className="pdf-edit-tool" onClick={() => redo(activeKey)} disabled={getHistoryIndex(activeKey) >= getHistory(activeKey).length - 1}>
            <Redo2 size={16} /> Redo
          </button>
        </div>
        <div className="pdf-expanded-zoom-bar">
          <button type="button" className="pdf-icon-btn" disabled={zoom <= ZOOM_MIN} onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <span className="pdf-expanded-zoom-label">{Math.round(zoom * 100)}%</span>
          <button type="button" className="pdf-icon-btn" disabled={zoom >= ZOOM_MAX} onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
          <span className="pdf-expanded-zoom-hint">50%–200%</span>
          <span className="pdf-expanded-page-label">Page {activeIndex + 1} of {pageOrder.length}</span>
        </div>
      </div>

      <div className="pdf-expanded-scroll" id="pdf-expanded-scroll">
        {pageOrder.map((key, i) => {
          const page = pageMap[key];
          if (!page) return null;
          const isActive = key === activeKey;
          return (
            <section
              key={key}
              id={`pdf-page-${key}`}
              className={`pdf-expanded-section${isActive ? ' pdf-expanded-section--active' : ''}`}
            >
              <button type="button" className="pdf-expanded-jump" onClick={() => onActiveChange(key)}>
                Page {i + 1}{isActive ? ' · editing' : ''}
              </button>
              {isActive && activeFile ? (
                <div className="pdf-expanded-canvas-wrap">
                  <PdfEditablePage
                    page={page}
                    fileData={activeFile.data}
                    maxWidth={renderWidth}
                    activeTool={activeTool}
                    annotations={annotations[key] ?? []}
                    onPushHistory={(anns) => pushHistory(key, anns)}
                    onLayout={handleLayout}
                    editable
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="pdf-expanded-inactive-page"
                  onClick={() => onActiveChange(key)}
                >
                  {page.thumb ? (
                    <img src={page.thumb} alt="" className="pdf-expanded-inactive-img" />
                  ) : (
                    <div className="pdf-page-thumb-placeholder pdf-expanded-loading">Page {i + 1}</div>
                  )}
                </button>
              )}
            </section>
          );
        })}
      </div>

      <div className="pdf-expanded-nav">
        <button
          type="button"
          className="pdf-btn pdf-btn--ghost pdf-btn--sm"
          disabled={activeIndex <= 0}
          onClick={() => onActiveChange(pageOrder[activeIndex - 1])}
        >
          Previous
        </button>
        <span>Page {activeIndex + 1} of {pageOrder.length}</span>
        <button
          type="button"
          className="pdf-btn pdf-btn--ghost pdf-btn--sm"
          disabled={activeIndex >= pageOrder.length - 1}
          onClick={() => onActiveChange(pageOrder[activeIndex + 1])}
        >
          Next
        </button>
      </div>
    </div>
  );
}
