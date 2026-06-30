import { useCallback, useEffect, useRef, useState } from 'react';
import { renderPagePreviewWithLayout } from '@/lib/tools/pdftools/pdf-render';

const SHAPE_TOOLS = ['highlight', 'rect', 'whiteout'];

/**
 * @param {{
 *   page: { key: string, fileId: string, pageIndex: number, rotation: number },
 *   fileData: Uint8Array,
 *   maxWidth: number,
 *   activeTool: string,
 *   annotations: import('@/lib/tools/pdftools/pdf-operations').Annotation[],
 *   onPushHistory: (anns: import('@/lib/tools/pdftools/pdf-operations').Annotation[]) => void,
 *   onLayout?: (layout: import('@/lib/tools/pdftools/pdf-render').PageLayout) => void,
 *   editable: boolean,
 * }} props
 */
export default function PdfEditablePage({
  page, fileData, maxWidth, activeTool, annotations, onPushHistory, onLayout, editable,
}) {
  const [preview, setPreview] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewRetry, setPreviewRetry] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [dragStart, setDragStart] = useState(null);
  const [dragRect, setDragRect] = useState(null);
  const [inlineInput, setInlineInput] = useState(null);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  const renderWidth = maxWidth;

  useEffect(() => {
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewFailed(false);
    void renderPagePreviewWithLayout(fileData, page.fileId, page.pageIndex, page.rotation, renderWidth)
      .then(({ dataUrl, layout }) => {
        if (cancelled) return;
        setPreview(dataUrl);
        setPreviewLoading(false);
        onLayout?.(layout);
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewFailed(true);
          setPreviewLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [fileData, page.fileId, page.pageIndex, page.rotation, renderWidth, previewRetry, onLayout]);

  useEffect(() => {
    if (inlineInput) inputRef.current?.focus();
  }, [inlineInput]);

  const addAnnotation = useCallback((ann) => {
    onPushHistory([...annotations, { ...ann, id: crypto.randomUUID() }]);
  }, [annotations, onPushHistory]);

  const overlayPoint = (e) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const commitInlineInput = () => {
    if (!inlineInput) return;
    const text = inlineInput.value.trim();
    if (!text) {
      setInlineInput(null);
      return;
    }
    if (inlineInput.kind === 'text') {
      addAnnotation({ type: 'text', x: inlineInput.x, y: inlineInput.y, text });
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = 280;
      canvas.height = 72;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#111';
        ctx.font = 'italic 32px Georgia, serif';
        ctx.fillText(text, 8, 48);
        addAnnotation({
          type: 'signature',
          x: inlineInput.x,
          y: inlineInput.y,
          width: 200,
          height: 52,
          imageDataUrl: canvas.toDataURL('image/png'),
        });
      }
    }
    setInlineInput(null);
  };

  const onPointerDown = (e) => {
    if (!editable || inlineInput) return;
    const pt = overlayPoint(e);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (activeTool === 'draw') {
      setDrawing(true);
      setDrawPoints([pt]);
      return;
    }

    if (SHAPE_TOOLS.includes(activeTool)) {
      setDragStart(pt);
      setDragRect({ x: pt.x, y: pt.y, width: 0, height: 0 });
      return;
    }

    if (activeTool === 'text') {
      setInlineInput({ kind: 'text', x: pt.x, y: pt.y, value: '' });
    }

    if (activeTool === 'signature') {
      setInlineInput({ kind: 'signature', x: pt.x, y: pt.y, value: '' });
    }
  };

  const onPointerMove = (e) => {
    if (!editable) return;
    const pt = overlayPoint(e);
    if (!pt) return;

    if (activeTool === 'draw' && drawing) {
      setDrawPoints((prev) => [...prev, pt]);
      return;
    }

    if (dragStart && SHAPE_TOOLS.includes(activeTool)) {
      setDragRect({
        x: Math.min(dragStart.x, pt.x),
        y: Math.min(dragStart.y, pt.y),
        width: Math.abs(pt.x - dragStart.x),
        height: Math.abs(pt.y - dragStart.y),
      });
    }
  };

  const onPointerUp = (e) => {
    if (!editable) return;
    e.currentTarget.releasePointerCapture(e.pointerId);

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

    if (dragStart && SHAPE_TOOLS.includes(activeTool)) {
      const pt = overlayPoint(e);
      if (pt) {
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
      }
      setDragStart(null);
      setDragRect(null);
    }
  };

  if (previewLoading) {
    return <div className="pdf-page-thumb-placeholder pdf-expanded-loading">Loading page…</div>;
  }

  if (previewFailed) {
    return (
      <button
        type="button"
        className="pdf-page-thumb-placeholder pdf-page-thumb-placeholder--error"
        onClick={() => {
          setPreviewFailed(false);
          setPreviewLoading(true);
          setPreviewRetry((n) => n + 1);
        }}
      >
        Could not render this page. Tap to retry.
      </button>
    );
  }

  return (
    <div className="pdf-edit-page pdf-edit-page--expanded">
      <img src={preview} alt="" className="pdf-edit-page-img" draggable={false} width={renderWidth} />
      {editable && (
        <div
          ref={overlayRef}
          className="pdf-edit-overlay"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {annotations.map((ann) => {
            if (ann.type === 'text') {
              return (
                <span key={ann.id} className="pdf-edit-ann pdf-edit-ann--text" style={{ left: ann.x, top: ann.y }}>
                  {ann.text}
                </span>
              );
            }
            if (SHAPE_TOOLS.includes(ann.type)) {
              return (
                <div
                  key={ann.id}
                  className={`pdf-edit-ann pdf-edit-ann--${ann.type}`}
                  style={{ left: ann.x, top: ann.y, width: ann.width, height: ann.height }}
                />
              );
            }
            if (ann.type === 'draw' && ann.points) {
              const w = Math.max(...ann.points.map((p) => p.x), 1);
              const h = Math.max(...ann.points.map((p) => p.y), 1);
              const path = ann.points.map((p) => `${p.x},${p.y}`).join(' ');
              return (
                <svg
                  key={ann.id}
                  className="pdf-edit-ann-draw"
                  style={{ left: ann.x, top: ann.y, width: w, height: h }}
                  viewBox={`0 0 ${w} ${h}`}
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
                  style={{ left: ann.x, top: ann.y, width: ann.width, height: ann.height }}
                />
              );
            }
            return null;
          })}
          {dragRect && dragRect.width > 0 && dragRect.height > 0 && (
            <div
              className={`pdf-edit-ann pdf-edit-ann--${activeTool} pdf-edit-ann--preview`}
              style={{
                left: dragRect.x,
                top: dragRect.y,
                width: dragRect.width,
                height: dragRect.height,
              }}
            />
          )}
          {drawing && drawPoints.length > 1 && (
            <svg className="pdf-edit-draw-preview" viewBox={`0 0 ${overlayRef.current?.clientWidth ?? 1} ${overlayRef.current?.clientHeight ?? 1}`}>
              <polyline
                points={drawPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#e33"
                strokeWidth="2"
              />
            </svg>
          )}
          {inlineInput && (
            <div
              className="pdf-inline-input-wrap"
              style={{ left: inlineInput.x, top: inlineInput.y }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                type="text"
                className="pdf-inline-input"
                placeholder={inlineInput.kind === 'signature' ? 'Type signature…' : 'Type text…'}
                value={inlineInput.value}
                onChange={(e) => setInlineInput((prev) => prev && { ...prev, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitInlineInput();
                  }
                  if (e.key === 'Escape') setInlineInput(null);
                }}
                onBlur={commitInlineInput}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
