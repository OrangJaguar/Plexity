import { useCallback, useEffect, useRef, useState } from 'react';
import { clampCropRect } from '@/lib/tools/image/image-crop.js';

const HANDLE_DEFS = [
  { id: 'nw', cursor: 'nwse-resize', mode: 'corner' },
  { id: 'n', cursor: 'ns-resize', mode: 'edge' },
  { id: 'ne', cursor: 'nesw-resize', mode: 'corner' },
  { id: 'e', cursor: 'ew-resize', mode: 'edge' },
  { id: 'se', cursor: 'nwse-resize', mode: 'corner' },
  { id: 's', cursor: 'ns-resize', mode: 'edge' },
  { id: 'sw', cursor: 'nesw-resize', mode: 'corner' },
  { id: 'w', cursor: 'ew-resize', mode: 'edge' },
];

/**
 * @param {object} props
 */
export default function ImageCanvas({
  composite,
  zoom,
  setZoom,
  pan,
  setPan,
  selected,
  transformEnabled,
  onTransform,
  onTransformCommit,
  onTransformBegin,
  onSelectLayer,
  doc,
  eraserActive,
  onErasePaint,
  onEraseCommit,
  cropDraft,
  onCropChange,
  cropRotation = 0,
  cropSource = null,
  annotateActive = false,
  annotateMode = 'draw',
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  liveStroke = null,
  brushPreview = null,
  onPlaceText,
  onPlaceRedact,
  onContextMenu,
  fitZoomKey = 0,
  editingTextId = null,
  onEditText,
  onPatchText,
  onFinishTextEdit,
}) {
  const stageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const viewRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const liveRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const dragRef = useRef(null);
  const fitZoomRef = useRef(1);
  const lastTapRef = useRef({ id: null, t: 0 });
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const [spacePan, setSpacePan] = useState(false);

  useEffect(() => {
    const canvas = viewRef.current;
    if (!canvas || !composite) return;
    if (canvas.width !== composite.width || canvas.height !== composite.height) {
      canvas.width = composite.width;
      canvas.height = composite.height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(composite, 0, 0);
  }, [composite]);

  useEffect(() => {
    const canvas = liveRef.current;
    if (!canvas || !composite) return;
    if (canvas.width !== composite.width || canvas.height !== composite.height) {
      canvas.width = composite.width;
      canvas.height = composite.height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!liveStroke?.points?.length) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = liveStroke.color || '#fff';
    ctx.lineWidth = liveStroke.width || 4;
    ctx.beginPath();
    liveStroke.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }, [liveStroke, composite]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !composite) return;
    const rect = stage.getBoundingClientRect();
    const pad = 40;
    const fit = Math.min(
      (rect.width - pad) / composite.width,
      (rect.height - pad) / composite.height,
      1,
    );
    const next = Math.max(0.08, Math.round(fit * 100) / 100);
    fitZoomRef.current = next;
    setZoom(next);
    setPan({ x: 0, y: 0 });
  }, [composite?.width, composite?.height, fitZoomKey, setZoom, setPan]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space') setSpacePan(true);
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') setSpacePan(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const clientToStage = useCallback((clientX, clientY) => {
    const stage = stageRef.current;
    if (!stage || !composite) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    const z = zoomRef.current;
    const p = panRef.current;
    const cx = rect.left + rect.width / 2 + p.x;
    const cy = rect.top + rect.height / 2 + p.y;
    return {
      x: (clientX - cx) / z + composite.width / 2,
      y: (clientY - cy) / z + composite.height / 2,
    };
  }, [composite]);

  const hitTestLayer = useCallback((x, y) => {
    for (let i = doc.layers.length - 1; i >= 0; i -= 1) {
      const layer = doc.layers[i];
      if (!layer.visible) continue;
      if (
        x >= layer.x && x <= layer.x + layer.width
        && y >= layer.y && y <= layer.y + layer.height
      ) {
        return layer;
      }
    }
    return null;
  }, [doc.layers]);

  const zoomAtPoint = useCallback((clientX, clientY, delta) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const p = panRef.current;
    const pointerX = clientX - rect.left - rect.width / 2 - p.x;
    const pointerY = clientY - rect.top - rect.height / 2 - p.y;
    setZoom((oldZoom) => {
      const next = Math.min(4, Math.max(0.08, Math.round((oldZoom + delta) * 100) / 100));
      const scale = next / oldZoom;
      setPan((oldPan) => ({
        x: oldPan.x - pointerX * (scale - 1),
        y: oldPan.y - pointerY * (scale - 1),
      }));
      return next;
    });
  }, [setPan, setZoom]);

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.02 : 0.02;
    zoomAtPoint(e.clientX, e.clientY, delta);
  };

  const cropBitmap = cropSource || selected?.source;
  const cropScaleX = cropBitmap && selected ? selected.width / cropBitmap.width : 1;
  const cropScaleY = cropBitmap && selected ? selected.height / cropBitmap.height : 1;

  const cropRectToDisplay = useCallback((rect) => {
    if (!selected || !rect) return null;
    return {
      left: selected.x + rect.x * cropScaleX,
      top: selected.y + rect.y * cropScaleY,
      width: rect.width * cropScaleX,
      height: rect.height * cropScaleY,
    };
  }, [selected, cropScaleX, cropScaleY]);

  const displayToCropRect = useCallback((displayRect) => {
    if (!cropBitmap || !selected) return null;
    return clampCropRect({
      x: (displayRect.x - selected.x) / cropScaleX,
      y: (displayRect.y - selected.y) / cropScaleY,
      width: displayRect.width / cropScaleX,
      height: displayRect.height / cropScaleY,
    }, cropBitmap.width, cropBitmap.height);
  }, [cropBitmap, selected, cropScaleX, cropScaleY]);

  const startPan = (e) => {
    dragRef.current = {
      type: 'pan',
      ox: e.clientX - panRef.current.x,
      oy: e.clientY - panRef.current.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const applyHandleResize = (handleId, mode, origin, pt) => {
    const min = 12;
    let { x, y, width, height } = origin;
    const right = origin.x + origin.width;
    const bottom = origin.y + origin.height;
    const cx = origin.x + origin.width / 2;
    const cy = origin.y + origin.height / 2;

    if (mode === 'corner') {
      if (handleId.includes('e')) width = Math.max(min, pt.x - origin.x);
      if (handleId.includes('w')) {
        width = Math.max(min, right - pt.x);
        x = right - width;
      }
      if (handleId.includes('s')) height = Math.max(min, pt.y - origin.y);
      if (handleId.includes('n')) {
        height = Math.max(min, bottom - pt.y);
        y = bottom - height;
      }
      // Uniform scale from opposite corner for true corners
      if (handleId.length === 2) {
        const aspect = origin.width / Math.max(1, origin.height);
        if (handleId === 'se' || handleId === 'nw') {
          if (Math.abs(pt.x - (handleId === 'se' ? origin.x : right)) / aspect
            > Math.abs(pt.y - (handleId === 'se' ? origin.y : bottom))) {
            height = Math.max(min, width / aspect);
            if (handleId === 'nw') y = bottom - height;
          } else {
            width = Math.max(min, height * aspect);
            if (handleId === 'nw') x = right - width;
          }
        } else {
          // ne / sw
          if (Math.abs(pt.x - (handleId === 'ne' ? origin.x : right)) / aspect
            > Math.abs(pt.y - (handleId === 'ne' ? bottom : origin.y))) {
            height = Math.max(min, width / aspect);
            if (handleId === 'ne') y = bottom - height;
            if (handleId === 'sw') x = right - width;
          } else {
            width = Math.max(min, height * aspect);
            if (handleId === 'ne') y = bottom - height;
            if (handleId === 'sw') x = right - width;
          }
        }
      }
    } else {
      // Edge: stretch one axis only
      if (handleId === 'e') width = Math.max(min, pt.x - origin.x);
      if (handleId === 'w') {
        width = Math.max(min, right - pt.x);
        x = right - width;
      }
      if (handleId === 's') height = Math.max(min, pt.y - origin.y);
      if (handleId === 'n') {
        height = Math.max(min, bottom - pt.y);
        y = bottom - height;
      }
    }

    const patch = { x, y, width, height };
    if (selected?.type === 'text' && selected.text) {
      const scale = width / origin.width;
      patch.text = {
        ...selected.text,
        fontSize: Math.max(8, Math.round((origin.fontSize || selected.text.fontSize) * scale)),
      };
    }
    onTransform(patch, { snap: false });
  };

  const onHandlePointerDown = (e, handleId, mode) => {
    e.stopPropagation();
    e.preventDefault();
    if (!selected || selected.locked) return;
    onTransformBegin?.();
    const origin = {
      x: selected.x,
      y: selected.y,
      width: selected.width,
      height: selected.height,
      fontSize: selected.text?.fontSize,
    };
    dragRef.current = { type: 'resize', handleId, mode, origin };
    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
  };

  const onWindowMove = (ev) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.type === 'resize') {
      const pt = clientToStage(ev.clientX, ev.clientY);
      applyHandleResize(drag.handleId, drag.mode, drag.origin, pt);
    }
  };

  const onWindowUp = () => {
    if (dragRef.current?.type === 'resize') onTransformCommit?.();
    dragRef.current = null;
    window.removeEventListener('pointermove', onWindowMove);
    window.removeEventListener('pointerup', onWindowUp);
  };

  const onPointerDown = (e) => {
    if (!composite) return;
    if (e.button === 2) return;
    const pt = clientToStage(e.clientX, e.clientY);

    if (spacePan || e.button === 1) {
      startPan(e);
      return;
    }

    if (annotateActive) {
      if (annotateMode === 'draw') {
        onDrawStart?.(pt.x, pt.y);
        dragRef.current = { type: 'draw' };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (annotateMode === 'text') {
        const textHit = hitTestLayer(pt.x, pt.y);
        if (textHit?.type === 'text') {
          onSelectLayer(textHit.id);
          return;
        }
        onPlaceText?.(pt.x, pt.y);
        return;
      }
      if (annotateMode === 'redact') {
        dragRef.current = { type: 'redact', startX: pt.x, startY: pt.y };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
    }

    if (eraserActive && selected && !selected.locked && selected.source) {
      onErasePaint?.(pt.x - selected.x, pt.y - selected.y);
      dragRef.current = { type: 'erase' };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (cropDraft && selected && cropBitmap && onCropChange) {
      const display = cropRectToDisplay(cropDraft);
      if (display) {
        const edge = Math.max(18, 22 / zoom);
        const near = (a, b) => Math.abs(a - b) <= edge;
        const inX = pt.x >= display.left - edge && pt.x <= display.left + display.width + edge;
        const inY = pt.y >= display.top - edge && pt.y <= display.top + display.height + edge;
        const onLeft = inY && near(pt.x, display.left);
        const onRight = inY && near(pt.x, display.left + display.width);
        const onTop = inX && near(pt.y, display.top);
        const onBottom = inX && near(pt.y, display.top + display.height);
        const inCrop = pt.x >= display.left && pt.x <= display.left + display.width
          && pt.y >= display.top && pt.y <= display.top + display.height;
        if (onLeft || onRight || onTop || onBottom) {
          dragRef.current = {
            type: 'crop-edge',
            edge: onLeft ? 'left' : onRight ? 'right' : onTop ? 'top' : 'bottom',
            startX: pt.x,
            startY: pt.y,
            origin: display,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
        if (inCrop) {
          dragRef.current = {
            type: 'crop-move',
            startX: pt.x,
            startY: pt.y,
            origin: display,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    const hit = hitTestLayer(pt.x, pt.y);

    if (hit) {
      const now = Date.now();
      if (hit.type === 'text' && lastTapRef.current.id === hit.id && now - lastTapRef.current.t < 400) {
        onEditText?.(hit.id);
        lastTapRef.current = { id: null, t: 0 };
        return;
      }
      lastTapRef.current = { id: hit.id, t: now };
      onSelectLayer(hit.id);
    }

    // Pan when dragging empty space or background (primary navigation).
    const canPan = !cropDraft && !eraserActive && !annotateActive
      && (!hit || hit.isBackground || hit.locked);
    if (canPan) {
      startPan(e);
      return;
    }

    if (transformEnabled && hit && !hit.locked && !hit.isBackground) {
      onTransformBegin?.();
      dragRef.current = {
        type: 'move',
        startX: pt.x,
        startY: pt.y,
        originX: hit.x,
        originY: hit.y,
      };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pt = clientToStage(e.clientX, e.clientY);

    if (drag.type === 'pan') {
      setPan({ x: e.clientX - drag.ox, y: e.clientY - drag.oy });
      return;
    }
    if (drag.type === 'draw') {
      onDrawMove?.(pt.x, pt.y);
      return;
    }
    if (drag.type === 'redact') {
      drag.currentX = pt.x;
      drag.currentY = pt.y;
      return;
    }
    if (drag.type === 'erase' && selected) {
      onErasePaint?.(pt.x - selected.x, pt.y - selected.y);
      return;
    }
    if (drag.type === 'crop-move' && onCropChange && drag.origin) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      const next = displayToCropRect({
        x: drag.origin.left + dx,
        y: drag.origin.top + dy,
        width: drag.origin.width,
        height: drag.origin.height,
      });
      if (next) onCropChange(next);
      return;
    }
    if (drag.type === 'crop-edge' && onCropChange && drag.origin) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      let { left, top, width, height } = drag.origin;
      if (drag.edge === 'left') {
        left += dx;
        width -= dx;
      } else if (drag.edge === 'right') {
        width += dx;
      } else if (drag.edge === 'top') {
        top += dy;
        height -= dy;
      } else if (drag.edge === 'bottom') {
        height += dy;
      }
      const next = displayToCropRect({ x: left, y: top, width, height });
      if (next) onCropChange(next);
      return;
    }
    if (drag.type === 'move') {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      onTransform({ x: drag.originX + dx, y: drag.originY + dy }, { snap: true });
    }
  };

  const onPointerUp = () => {
    const drag = dragRef.current;
    if (drag?.type === 'move' || drag?.type === 'resize') onTransformCommit?.();
    if (drag?.type === 'erase') onEraseCommit?.();
    if (drag?.type === 'draw') onDrawEnd?.();
    if (drag?.type === 'redact') {
      const x1 = drag.startX;
      const y1 = drag.startY;
      const x2 = drag.currentX ?? drag.startX;
      const y2 = drag.currentY ?? drag.startY;
      onPlaceRedact?.(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1),
      );
    }
    dragRef.current = null;
  };

  const onCtxMenu = (e) => {
    e.preventDefault();
    if (!composite) return;
    const pt = clientToStage(e.clientX, e.clientY);
    const hit = hitTestLayer(pt.x, pt.y);
    if (hit) onSelectLayer(hit.id);
    onContextMenu?.({
      clientX: e.clientX,
      clientY: e.clientY,
      layerId: hit?.id ?? null,
    });
  };

  if (!composite) {
    return <div className="tools-image-canvas-empty" />;
  }

  const selStyle = selected ? {
    left: selected.x,
    top: selected.y,
    width: selected.width,
    height: selected.height,
    transform: `rotate(${selected.rotation + (cropDraft ? cropRotation : 0)}deg)`,
  } : null;

  const cropDisplay = cropDraft ? cropRectToDisplay(cropDraft) : null;
  const editingLayer = editingTextId
    ? doc.layers.find((l) => l.id === editingTextId)
    : null;

  const brushSize = brushPreview?.size || 0;

  return (
    <div className="tools-image-canvas-wrap">
      <div
        ref={stageRef}
        className="tools-image-canvas-stage"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={onCtxMenu}
      >
        <div
          className="tools-image-canvas-world"
          style={{
            width: composite.width,
            height: composite.height,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <canvas ref={viewRef} className="tools-image-canvas-view" />
          <canvas ref={liveRef} className="tools-image-canvas-live" />
          {selected && transformEnabled && !eraserActive && !annotateActive && !cropDraft && (
            <div className="tools-image-selection" style={selStyle}>
              {!selected.isBackground && HANDLE_DEFS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`tools-image-handle tools-image-handle--${h.id}${h.mode === 'edge' ? ' tools-image-handle--edge' : ''}`}
                  style={{ cursor: h.cursor }}
                  aria-label={`Resize ${h.id}`}
                  onPointerDown={(e) => onHandlePointerDown(e, h.id, h.mode)}
                />
              ))}
            </div>
          )}
          {cropDisplay && selected && (
            <div
              className="tools-image-crop-overlay"
              style={{
                left: cropDisplay.left,
                top: cropDisplay.top,
                width: cropDisplay.width,
                height: cropDisplay.height,
                transform: `rotate(${cropRotation}deg)`,
              }}
            >
              <span className="tools-image-crop-edge tools-image-crop-edge--n" />
              <span className="tools-image-crop-edge tools-image-crop-edge--s" />
              <span className="tools-image-crop-edge tools-image-crop-edge--e" />
              <span className="tools-image-crop-edge tools-image-crop-edge--w" />
            </div>
          )}
          {editingLayer?.type === 'text' && editingLayer.text && (
            <textarea
              className="tools-image-text-edit"
              style={{
                left: editingLayer.x,
                top: editingLayer.y,
                width: editingLayer.width,
                height: editingLayer.height,
                fontFamily: editingLayer.text.fontFamily,
                fontSize: `${editingLayer.text.fontSize}px`,
                fontWeight: editingLayer.text.fontWeight,
                fontStyle: editingLayer.text.fontStyle,
                textAlign: editingLayer.text.align,
                color: editingLayer.text.color,
                textDecoration: editingLayer.text.underline ? 'underline' : 'none',
              }}
              autoFocus
              value={editingLayer.text.text}
              onChange={(e) => onPatchText?.({ text: e.target.value })}
              onBlur={() => onFinishTextEdit?.()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onFinishTextEdit?.();
                }
                e.stopPropagation();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            />
          )}
        </div>
        {brushPreview && (
          <div
            className="tools-image-brush-preview"
            style={{
              width: Math.max(4, brushSize * zoom),
              height: Math.max(4, brushSize * zoom),
              borderColor: brushPreview.color || '#fff',
            }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
