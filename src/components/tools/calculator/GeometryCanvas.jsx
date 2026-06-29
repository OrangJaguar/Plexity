import { useCallback, useEffect, useRef, useState } from 'react';
import { drawGraph } from '@/lib/tools/calculator/render/graph-canvas';
import { createViewport, screenToWorld, worldToScreen } from '@/lib/tools/calculator/render/graph-viewport';
import { updateDependentObjects, distance, angleAt } from '@/lib/tools/calculator/geometry/constraints';

export default function GeometryCanvas({ geometry, onUpdateGeometry }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [viewport] = useState(() => createViewport());
  const [dragId, setDragId] = useState(null);

  const objects = geometry?.objects || [];
  const tool = geometry?.tool || 'select';

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.max(200, width), height: Math.max(200, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGraph(ctx, { width: size.width, height: size.height, viewport, curves: [], settings: { grid: true, axes: true } });

    objects.forEach((obj) => {
      if (obj.type === 'point' && obj.point) {
        const { x, y } = worldToScreen(obj.point.x, obj.point.y, viewport, size.width, size.height);
        ctx.fillStyle = obj.color || '#f59e0b';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        if (obj.label) {
          ctx.fillStyle = '#fff';
          ctx.fillText(obj.label, x + 8, y - 8);
        }
      }
      if ((obj.type === 'line' || obj.type === 'segment') && obj.a && obj.b) {
        const p1 = worldToScreen(obj.a.x, obj.a.y, viewport, size.width, size.height);
        const p2 = worldToScreen(obj.b.x, obj.b.y, viewport, size.width, size.height);
        ctx.strokeStyle = obj.color || '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        if (obj.measure) {
          const len = distance(obj.a, obj.b);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fillText(len.toFixed(2), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        }
      }
      if (obj.type === 'circle' && obj.center && obj.radius) {
        const c = worldToScreen(obj.center.x, obj.center.y, viewport, size.width, size.height);
        const edge = worldToScreen(obj.center.x + obj.radius, obj.center.y, viewport, size.width, size.height);
        const r = Math.abs(edge.x - c.x);
        ctx.strokeStyle = obj.color || '#22c55e';
        ctx.beginPath();
        ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [size, viewport, objects]);

  useEffect(() => {
    const id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
  }, [render]);

  const handlePointerDown = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport, size.width, size.height);
    if (tool === 'point') {
      const id = `geo_${Date.now()}`;
      onUpdateGeometry?.({
        ...geometry,
        objects: [...objects, { id, type: 'point', label: id.slice(-4), point: world, color: '#f59e0b' }],
      });
      return;
    }
    const hit = objects.find((o) => o.type === 'point' && o.point && Math.hypot(o.point.x - world.x, o.point.y - world.y) < 0.4);
    if (hit) setDragId(hit.id);
  };

  const handlePointerMove = (e) => {
    if (!dragId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport, size.width, size.height);
    const next = objects.map((o) => (o.id === dragId ? { ...o, point: world } : o));
    onUpdateGeometry?.({ ...geometry, objects: updateDependentObjects(next) });
  };

  const handlePointerUp = () => setDragId(null);

  return (
    <div className="calc-geometry-wrap" ref={containerRef}>
      <div className="calc-geometry-toolbar">
        {['select', 'point', 'line', 'segment', 'circle', 'perpendicular', 'parallel'].map((t) => (
          <button
            key={t}
            type="button"
            className={tool === t ? 'is-active' : ''}
            onClick={() => onUpdateGeometry?.({ ...geometry, tool: t })}
          >
            {t}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="calc-geometry-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
    </div>
  );
}

export { angleAt };
