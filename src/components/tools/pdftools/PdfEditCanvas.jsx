import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Type, Highlighter, Pencil, Square, Eraser, PenLine, Undo2, Redo2,
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

/**
 * @param {{
 *   fileData: Uint8Array,
 *   pageCount: number,
 *   annotations: Record<number, import('@/lib/tools/pdftools/pdf-operations').Annotation[]>,
 *   onChange: (next: Record<number, import('@/lib/tools/pdftools/pdf-operations').Annotation[]>) => void,
 * }} props
 */
export default function PdfEditCanvas({ fileData, pageCount, annotations, onChange }) {
  const [pageIndex, setPageIndex] = useState(0);
  const [activeTool, setActiveTool] = useState('text');
  const [preview, setPreview] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [history, setHistory] = useState([annotations]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  const pageAnnotations = annotations[pageIndex] ?? [];

  useEffect(() => {
    let cancelled = false;
    void renderPagePreview(fileData, pageIndex).then((url) => {
      if (!cancelled) setPreview(url);
    });
    return () => { cancelled = true; };
  }, [fileData, pageIndex]);

  const pushHistory = useCallback((next) => {
    setHistory((h) => [...h.slice(0, historyIndex + 1), next]);
    setHistoryIndex((i) => i + 1);
    onChange(next);
  }, [historyIndex, onChange]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const next = history[historyIndex - 1];
    setHistoryIndex((i) => i - 1);
    onChange(next);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex((i) => i + 1);
    onChange(next);
  };

  const addAnnotation = (ann) => {
    const next = {
      ...annotations,
      [pageIndex]: [...(annotations[pageIndex] ?? []), { ...ann, id: crypto.randomUUID() }],
    };
    pushHistory(next);
  };

  const overlayPoint = (e) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
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
      if (text?.trim()) {
        addAnnotation({ type: 'text', x: pt.x, y: pt.y, text: text.trim() });
      }
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
    if (activeTool === 'draw' && drawing) {
      const pt = overlayPoint(e);
      if (pt) setDrawPoints((prev) => [...prev, pt]);
    }
  };

  const onPointerUp = (e) => {
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

  return (
    <div className="pdf-edit">
      <div className="pdf-edit-toolbar">
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
        <button type="button" className="pdf-edit-tool" onClick={undo} disabled={historyIndex <= 0}>
          <Undo2 size={16} /> Undo
        </button>
        <button type="button" className="pdf-edit-tool" onClick={redo} disabled={historyIndex >= history.length - 1}>
          <Redo2 size={16} /> Redo
        </button>
      </div>

      <div className="pdf-edit-canvas-wrap">
        <div className="pdf-edit-page" ref={canvasRef}>
          {preview && <img src={preview} alt="" className="pdf-edit-page-img" />}
          <div
            ref={overlayRef}
            className="pdf-edit-overlay"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {pageAnnotations.map((ann) => {
              if (ann.type === 'text') {
                return (
                  <span
                    key={ann.id}
                    className="pdf-edit-ann pdf-edit-ann--text"
                    style={{ left: ann.x, top: ann.y }}
                  >
                    {ann.text}
                  </span>
                );
              }
              if (['highlight', 'rect', 'whiteout'].includes(ann.type)) {
                return (
                  <div
                    key={ann.id}
                    className={`pdf-edit-ann pdf-edit-ann--${ann.type}`}
                    style={{
                      left: ann.x,
                      top: ann.y,
                      width: ann.width,
                      height: ann.height,
                    }}
                  />
                );
              }
              if (ann.type === 'draw' && ann.points) {
                const path = ann.points.map((p) => `${p.x},${p.y}`).join(' ');
                return (
                  <svg
                    key={ann.id}
                    className="pdf-edit-ann-draw"
                    style={{ left: ann.x, top: ann.y }}
                  >
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
                    style={{
                      left: ann.x,
                      top: ann.y,
                      width: ann.width,
                      height: ann.height,
                    }}
                  />
                );
              }
              return null;
            })}
            {drawing && drawPoints.length > 1 && (
              <svg className="pdf-edit-draw-preview">
                <polyline
                  points={drawPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#e33"
                  strokeWidth="2"
                />
              </svg>
            )}
          </div>
        </div>
      </div>

      <div className="pdf-edit-nav">
        <button
          type="button"
          className="pdf-btn pdf-btn--ghost pdf-btn--sm"
          disabled={pageIndex <= 0}
          onClick={() => setPageIndex((i) => i - 1)}
        >
          Previous
        </button>
        <span>Page {pageIndex + 1} of {pageCount}</span>
        <button
          type="button"
          className="pdf-btn pdf-btn--ghost pdf-btn--sm"
          disabled={pageIndex >= pageCount - 1}
          onClick={() => setPageIndex((i) => i + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
