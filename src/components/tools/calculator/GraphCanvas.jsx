import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { sampleAllCurves } from '@/lib/tools/calculator/engine/sampler-2d';
import { computeFeaturePoints } from '@/lib/tools/calculator/engine/feature-points';
import { drawGraph, exportCanvasPng } from '@/lib/tools/calculator/render/graph-canvas';
import { pan, screenToWorld, zoomAt, stabilizeViewport } from '@/lib/tools/calculator/render/graph-viewport';
import { formatPointLabel } from '@/lib/tools/calculator/format-coord';
import GraphToolbar from '@/components/tools/calculator/GraphToolbar';
import GraphSettingsModal from '@/components/tools/calculator/GraphSettingsModal';
import MathKeyboard from '@/components/tools/calculator/MathKeyboard';

const PAN_THRESHOLD_PX = 4;
const WHEEL_ZOOM_FACTOR = 1.08;

export default function GraphCanvas({
  viewport,
  viewportEpoch = 0,
  onViewportCommit,
  onUserViewportChange,
  compiled,
  scope,
  expressions,
  settings,
  onHome,
  onAutoFit,
  onUpdateSettings,
  onUpdateViewport,
  keyboardTab,
  onKeyboardTabChange,
  points = [],
  onAddPointToList,
  onKeyboardInsert,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [hoverFeature, setHoverFeature] = useState(null);
  const [pinnedFeature, setPinnedFeature] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [activeViewport, setActiveViewport] = useState(() => stabilizeViewport(viewport));
  const activeViewportRef = useRef(activeViewport);
  const panStart = useRef(null);
  const isDragging = useRef(false);
  const lastEpoch = useRef(viewportEpoch);

  const activeFeature = pinnedFeature || hoverFeature;

  useEffect(() => {
    activeViewportRef.current = activeViewport;
  }, [activeViewport]);

  useEffect(() => {
    if (viewportEpoch !== lastEpoch.current) {
      lastEpoch.current = viewportEpoch;
      setActiveViewport(stabilizeViewport(viewport));
    }
  }, [viewport, viewportEpoch]);

  const featurePoints = useMemo(() => (
    computeFeaturePoints(compiled, scope, expressions, activeViewport)
  ), [compiled, scope, expressions, activeViewport]);

  const curves = useMemo(() => {
    if (!compiled?.length || !scope) return [];
    return sampleAllCurves(compiled, scope, activeViewport, size.width, size.height, expressions);
  }, [compiled, scope, activeViewport, size.width, size.height, expressions]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const { width, height } = size;
    if (width < 1 || height < 1) return;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGraph(ctx, {
      width,
      height,
      viewport: activeViewport,
      curves,
      points,
      featurePoints,
      hoveredFeature: activeFeature,
      settings,
    });
  }, [size, activeViewport, curves, points, featurePoints, activeFeature, settings]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const w = Math.max(200, Math.floor(width));
      const h = Math.max(200, Math.floor(height));
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const applyViewport = useCallback((vp, userInitiated = false) => {
    const stable = stabilizeViewport(vp);
    setActiveViewport(stable);
    if (userInitiated) {
      onUserViewportChange?.(stable);
      onViewportCommit?.(stable);
    }
  }, [onViewportCommit, onUserViewportChange]);

  const nearestFeature = useCallback((worldX, worldY) => {
    const threshold = (activeViewportRef.current.xMax - activeViewportRef.current.xMin) * 0.04;
    let best = null;
    let bestDist = Infinity;
    for (const fp of featurePoints) {
      const d = Math.hypot(fp.x - worldX, fp.y - worldY);
      if (d < bestDist) {
        bestDist = d;
        best = fp;
      }
    }
    return bestDist <= threshold ? best : null;
  }, [featurePoints]);

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    setPinnedFeature(null);
    canvasRef.current?.setPointerCapture(e.pointerId);
    panStart.current = { x: e.clientX, y: e.clientY };
    isDragging.current = false;
  };

  const handlePointerMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (panStart.current && (e.buttons & 1)) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      if (!isDragging.current && Math.hypot(dx, dy) < PAN_THRESHOLD_PX) return;
      isDragging.current = true;
      setHoverFeature(null);
      setPinnedFeature(null);
      setActiveViewport((prev) => {
        const next = stabilizeViewport(pan(prev, dx, dy, size.width, size.height));
        activeViewportRef.current = next;
        return next;
      });
      panStart.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (pinnedFeature) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = screenToWorld(sx, sy, activeViewportRef.current, size.width, size.height);
    setHoverFeature(nearestFeature(world.x, world.y));
  };

  const handlePointerUp = (e) => {
    if (isDragging.current) {
      applyViewport(activeViewportRef.current, true);
    } else if (hoverFeature) {
      setPinnedFeature(hoverFeature);
    }
    panStart.current = null;
    isDragging.current = false;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY > 0 ? 1 / WHEEL_ZOOM_FACTOR : WHEEL_ZOOM_FACTOR;
    applyViewport(
      zoomAt(activeViewportRef.current, e.clientX - rect.left, e.clientY - rect.top, size.width, size.height, factor),
      true,
    );
  }, [applyViewport, size.width, size.height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const tooltipPos = useMemo(() => {
    if (!activeFeature) return null;
    const vp = activeViewport;
    const x = ((activeFeature.x - vp.xMin) / (vp.xMax - vp.xMin)) * size.width;
    const y = size.height - ((activeFeature.y - vp.yMin) / (vp.yMax - vp.yMin)) * size.height;
    return { left: x, top: y };
  }, [activeFeature, activeViewport, size]);

  return (
    <div className="calc-graph-canvas-wrap" ref={containerRef}>
      <GraphToolbar
        onHome={onHome}
        onZoomIn={() => applyViewport(zoomAt(activeViewport, size.width / 2, size.height / 2, size.width, size.height, 1.2), true)}
        onZoomOut={() => applyViewport(zoomAt(activeViewport, size.width / 2, size.height / 2, size.width, size.height, 1 / 1.2), true)}
        onAutoFit={onAutoFit}
        onExport={() => canvasRef.current && exportCanvasPng(canvasRef.current)}
        onOpenSettings={() => setSettingsOpen((v) => !v)}
        settingsOpen={settingsOpen}
        onToggleKeyboard={() => setKeyboardOpen((v) => !v)}
        keyboardOpen={keyboardOpen}
      />
      {settingsOpen ? (
        <GraphSettingsModal
          open={settingsOpen}
          settings={settings}
          viewport={activeViewport}
          onClose={() => setSettingsOpen(false)}
          onChangeSettings={onUpdateSettings}
          onChangeViewport={(vp) => {
            applyViewport(vp, true);
            onUpdateViewport?.(vp);
          }}
        />
      ) : null}
      <div className="calc-graph-canvas-stage">
        <canvas
          ref={canvasRef}
          className="calc-graph-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={(e) => {
            if (!(e.buttons & 1)) {
              handlePointerUp(e);
              if (!pinnedFeature) setHoverFeature(null);
            }
          }}
        />
        {activeFeature && tooltipPos ? (
          <div
            className="calc-feature-tooltip"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
            onPointerEnter={() => setPinnedFeature(activeFeature)}
            onPointerLeave={() => setPinnedFeature(null)}
          >
            <span>{formatPointLabel(activeFeature.x, activeFeature.y, 3)}</span>
            {onAddPointToList ? (
              <button
                type="button"
                className="calc-feature-export-btn"
                title="Add point to expression list"
                onClick={() => {
                  onAddPointToList(activeFeature.x, activeFeature.y);
                  setPinnedFeature(null);
                  setHoverFeature(null);
                }}
              >
                <Plus size={14} />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <MathKeyboard
        visible={keyboardOpen}
        floating
        tab={keyboardTab}
        onTabChange={onKeyboardTabChange}
        onInsert={(snippet) => onKeyboardInsert?.(snippet)}
        onClose={() => setKeyboardOpen(false)}
      />
    </div>
  );
}
