import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Type, Highlighter, Pencil, Square, Eraser, PenLine, Undo2, Redo2,
  ZoomIn, ZoomOut,
} from 'lucide-react';
import { renderPagePreview } from '@/lib/tools/pdftools/pdf-render';

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
const BASE_WIDTH = 880;

function clampZoom(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100));
}

/**
 * @param {{
 *   page: { key: string, fileId: string, pageIndex: number, rotation: number },
 *   fileData: Uint8Array,
 *   zoom: number,
 *   activeTool: string,
 *   annotations: import('@/lib/tools/pdftools/pdf-operations').Annotation[],
 *   onChange: (anns: import('@/lib/tools/pdftools/pdf-operations').Annotation[]) => void,
 *   history: import('@/lib/tools/pdftools/pdf-operations').Annotation[][],
 *   historyIndex: number,
 *   onPushHistory: (anns: import('@/lib/tools/pdftools/pdf-operations').Annotation[]) => void,
 *   onUndo: () => void,
 *   onRedo: () => void,
 *   editable: boolean,
 * }} props
 */
function PdfPageCanvas({
  page, fileData, zoom, activeTool, annotations, onChange,
  history, historyIndex, onPushHistory, onUndo, onRedo, editable,
}) {
  const [preview, setPreview] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const overlayRef = useRef(null);

  const renderWidth = Math.round(BASE_WIDTH * zoom);

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewFailed(false);
    void renderPagePreview(fileData, page.fileId, page.pageIndex, page.rotation, renderWidth)
      .then((url) => {
        if (!cancelled) {
          setPreview(url);
          setPreviewLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewFailed(true);
          setPreviewLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [fileData, page.fileId, page.pageIndex, page.rotation, renderWidth]);

  const addAnnotation = (ann) => {
    onPushHistory([...annotations, { ...ann, id: crypto.randomUUID() }]);
  };

  const overlayPoint = (e) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    if (!editable) return;
    const pt = overlayPoint(e);
    if (!pt) return;

    if (activeTool === 'draw') {
      setDrawing(true);
      setDrawPoints([pt]);
      return;
    }

    if (['highlight', 'rect', 'whiteout'].includes(activeTool)) {
      setDragStart(pt);
    }

    if (activeTool === 'text') {
      const text = window.prompt('Enter text');
      if (text?.trim()) addAnnotation({ type: 'text', x: pt.x, y: pt.y, text: text.trim() });
    }

    if (activeTool === 'signature') {
      const text = window.prompt('Type your signature');
      if (!text?.trim()) return;
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#111';
      ctx.font = 'italic 28px Georgia, serif';
      ctx.fillText(text.trim(), 8, 44);
      addAnnotation({
        type: 'signature',
        x: pt.x,
        y: pt.y,
        width: 180,
        height: 48,
        imageDataUrl: canvas.toDataURL('image/png'),
      });
    }
  };

  const onPointerMove = (e) => {
    if (!editable || activeTool !== 'draw' || !drawing) return;
    const pt = overlayPoint(e);
    if (pt) setDrawPoints((prev) => [...prev, pt]);
  };

  const onPointerUp = (e) => {
    if (!editable) return;

    if (activeTool === 'draw' && drawing) {
      setDrawing(false);
      if (drawPoints.length > 1) {
        const minX = Math.min(...drawPoints.map((p) => p.x));
        const minY = Math.min(...drawPoints.map((p) => p.y));
        addAnnotation({
          type: 'draw',
          x: minX,
          y: minY,
          points: drawPoints.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          strokeWidth: 2,
        });
      }
      setDrawPoints([]);
      return;
    }

    if (dragStart && ['highlight', 'rect', 'whiteout'].includes(activeTool)) {
      const pt = overlayPoint(e);
      if (!pt) return;
      const width = Math.abs(pt.x - dragStart.x);
      const height = Math.abs(pt.y - dragStart.y);
      if (width > 4 && height > 4) {
        addAnnotation({
          type: activeTool,
          x: Math.min(dragStart.x, pt.x),
          y: Math.min(dragStart.y, pt.y),
          width,
          height,
        });
      }
      setDragStart(null);
    }
  };

  if (previewLoading) {
    return <div className="pdf-page-thumb-placeholder pdf-expanded-loading">Loading page…</div>;
  }

  if (previewFailed) {
    return (
      <div className="pdf-page-thumb-placeholder pdf-page-thumb-placeholder--error">
        Could not render this page.
      </div>
    );
  }

  return (
    <div className="pdf-edit-page pdf-edit-page--expanded">
      <img src={preview} alt="" className="pdf-edit-page-img" draggable={false} />
      {editable && (
        <div
          ref={overlayRef}
          className="pdf-edit-overlay"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {annotations.map((ann) => {
            if (ann.type === 'text') {
              return (
                <span key={ann.id} className="pdf-edit-ann pdf-edit-ann--text" style={{ left: ann.x, top: ann.y }}>
                  {ann.text}
                </span>
              );
            }
            if (['highlight', 'rect', 'whiteout'].includes(ann.type)) {
              return (
                <div
                  key={ann.id}
                  className={`pdf-edit-ann pdf-edit-ann--${ann.type}`}
                  style={{ left: ann.x, top: ann.y, width: ann.width, height: ann.height }}
                />
              );
            }
            if (ann.type === 'draw' && ann.points) {
              const path = ann.points.map((p) => `${p.x},${p.y}`).join(' ');
              return (
                <svg key={ann.id} className="pdf-edit-ann-draw" style={{ left: ann.x, top: ann.y }}>
                  <polyline points={path} fill="none" stroke="#e33" strokeWidth="2" />
                </svg>
              );
            }
            if (ann.type === 'signature' && ann.imageDataUrl) {
              return (
                <img
                  key={ann.id}
                  src={ann.imageDataUrl}
                  alt="Signature"
                  className="pdf-edit-ann-signature"
                  style={{ left: ann.x, top: ann.y, width: ann.width, height: ann.height }}
                />
              );
            }
            return null;
          })}
          {drawing && drawPoints.length > 1 && (
            <svg className="pdf-edit-draw-preview">
              <polyline points={drawPoints.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#e33" strokeWidth="2" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * @param {{
 *   pageOrder: string[],
 *   pages: Array<{ key: string, fileId: string, pageIndex: number, rotation: number }>,
 *   fileMap: Record<string, { data: Uint8Array }>,
 *   activePageKey: string|null,
 *   scrollToKey: string|null,
 *   onActiveChange: (key: string) => void,
 *   onScrollDone: () => void,
 *   annotations: Record<string, import('@/lib/tools/pdftools/pdf-operations').Annotation[]>,
 *   onAnnotationsChange: (key: string, anns: import('@/lib/tools/pdftools/pdf-operations').Annotation[]) => void,
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
}) {
  const pageMap = Object.fromEntries(pages.map((p) => [p.key, p]));
  const activeKey = activePageKey && pageMap[activePageKey] ? activePageKey : pageOrder[0];
  const activeIndex = pageOrder.indexOf(activeKey);

  const [activeTool, setActiveTool] = useState('text');
  const [zoom, setZoom] = useState(1);
  const [histories, setHistories] = useState({});
  const [historyIndices, setHistoryIndices] = useState({});

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
    const next = h[idx - 1];
    setHistoryIndices((prev) => ({ ...prev, [key]: idx - 1 }));
    onAnnotationsChange(key, next);
  };

  const redo = (key) => {
    const idx = getHistoryIndex(key);
    const h = getHistory(key);
    if (idx >= h.length - 1) return;
    const next = h[idx + 1];
    setHistoryIndices((prev) => ({ ...prev, [key]: idx + 1 }));
    onAnnotationsChange(key, next);
  };

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
          const f = fileMap[page.fileId];
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
              {f ? (
                isActive ? (
                  <PdfPageCanvas
                    page={page}
                    fileData={f.data}
                    zoom={zoom}
                    activeTool={activeTool}
                    annotations={annotations[key] ?? []}
                    onChange={(anns) => onAnnotationsChange(key, anns)}
                    history={getHistory(key)}
                    historyIndex={getHistoryIndex(key)}
                    onPushHistory={(anns) => pushHistory(key, anns)}
                    onUndo={() => undo(key)}
                    onRedo={() => redo(key)}
                    editable
                  />
                ) : (
                  <button
                    type="button"
                    className="pdf-expanded-page-hit"
                    onClick={() => onActiveChange(key)}
                  >
                    <PdfPageCanvas
                      page={page}
                      fileData={f.data}
                      zoom={zoom}
                      activeTool={activeTool}
                      annotations={annotations[key] ?? []}
                      onChange={(anns) => onAnnotationsChange(key, anns)}
                      history={getHistory(key)}
                      historyIndex={getHistoryIndex(key)}
                      onPushHistory={(anns) => pushHistory(key, anns)}
                      onUndo={() => undo(key)}
                      onRedo={() => redo(key)}
                      editable={false}
                    />
                  </button>
                )
              ) : (
                <p className="pdf-muted">File data unavailable.</p>
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
