import { niceTicks, worldToScreen } from '@/lib/tools/calculator/render/graph-viewport';

function canvasBackground() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
  if (!raw) return '#0a0a0a';
  if (raw.startsWith('#') || raw.startsWith('rgb') || raw.startsWith('hsl(')) return raw;
  return `hsl(${raw})`;
}

export function drawGraph(ctx, {
  width,
  height,
  viewport,
  curves = [],
  points = [],
  markers = [],
  featurePoints = [],
  hoveredFeature = null,
  settings = { grid: true, axes: true },
  trace = null,
}) {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, width * dpr, height * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  ctx.fillStyle = canvasBackground();
  ctx.fillRect(0, 0, width, height);

  if (settings.grid) drawGrid(ctx, viewport, width, height);
  drawAxes(ctx, viewport, width, height, settings);

  for (const curve of curves) {
    drawCurve(ctx, curve.segments, curve.color || '#3b82f6', viewport, width, height);
  }

  for (const pt of points) {
    drawPoint(ctx, pt.x, pt.y, pt.color || '#f59e0b', viewport, width, height, pt.label);
  }

  for (const m of markers) {
    drawMarker(ctx, m.x, m.y, m.color || '#22c55e', viewport, width, height, m.label);
  }

  for (const fp of featurePoints) {
    const isHover = hoveredFeature
      && Math.abs(hoveredFeature.x - fp.x) < 1e-6
      && Math.abs(hoveredFeature.y - fp.y) < 1e-6;
    drawFeaturePoint(ctx, fp.x, fp.y, fp.color || '#94a3b8', viewport, width, height, isHover);
  }

  if (trace) {
    drawTrace(ctx, trace, viewport, width, height);
  }

  ctx.restore();
}

function drawGrid(ctx, viewport, width, height) {
  const xTicks = niceTicks(viewport.xMin, viewport.xMax);
  const yTicks = niceTicks(viewport.yMin, viewport.yMax);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;

  xTicks.forEach((x) => {
    const { x: sx } = worldToScreen(x, 0, viewport, width, height);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  });

  yTicks.forEach((y) => {
    const { y: sy } = worldToScreen(0, y, viewport, width, height);
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  });
}

function drawAxes(ctx, viewport, width, height, settings = {}) {
  const showX = settings.xAxis !== false;
  const showY = settings.yAxis !== false;
  const xTicks = niceTicks(viewport.xMin, viewport.xMax);
  const yTicks = niceTicks(viewport.yMin, viewport.yMax);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.75;

  if (showY && viewport.xMin <= 0 && viewport.xMax >= 0) {
    const { x: sx } = worldToScreen(0, 0, viewport, width, height);
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
    ctx.stroke();
  }

  if (showX && viewport.yMin <= 0 && viewport.yMax >= 0) {
    const { y: sy } = worldToScreen(0, 0, viewport, width, height);
    ctx.beginPath();
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px system-ui, sans-serif';
  if (showX) {
    xTicks.forEach((x) => {
      if (Math.abs(x) < 1e-10) return;
      const { x: sx, y: sy } = worldToScreen(x, 0, viewport, width, height);
      ctx.fillText(formatTick(x), sx - 8, Math.min(height - 4, sy + 14));
    });
  }
  if (showY) {
    yTicks.forEach((y) => {
      if (Math.abs(y) < 1e-10) return;
      const { x: sx, y: sy } = worldToScreen(0, y, viewport, width, height);
      ctx.fillText(formatTick(y), Math.max(4, sx + 6), sy + 4);
    });
  }
}

function formatTick(v) {
  if (Math.abs(v) >= 10000 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
  return Number(v.toPrecision(4)).toString();
}

function drawCurve(ctx, segments, color, viewport, width, height) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.75;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  for (const seg of segments) {
    if (seg.length < 2) continue;
    ctx.beginPath();
    seg.forEach((pt, i) => {
      const { x, y } = worldToScreen(pt.x, pt.y, viewport, width, height);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function drawPoint(ctx, x, y, color, viewport, width, height, label) {
  const { x: sx, y: sy } = worldToScreen(x, y, viewport, width, height);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();
  if (label) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(label, sx + 8, sy - 8);
  }
}

function drawMarker(ctx, x, y, color, viewport, width, height, label) {
  drawPoint(ctx, x, y, color, viewport, width, height, label);
}

function drawFeaturePoint(ctx, x, y, color, viewport, width, height, hovered) {
  const { x: sx, y: sy } = worldToScreen(x, y, viewport, width, height);
  const radius = hovered ? 6.5 : 4.5;
  ctx.fillStyle = hovered ? color : 'rgba(200,200,200,0.85)';
  ctx.strokeStyle = hovered ? '#fff' : color;
  ctx.lineWidth = hovered ? 2 : 1.25;
  ctx.beginPath();
  ctx.arc(sx, sy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawTrace(ctx, trace, viewport, width, height) {
  const { x: sx, y: sy } = worldToScreen(trace.x, trace.y, viewport, width, height);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(sx, 0);
  ctx.lineTo(sx, height);
  ctx.moveTo(0, sy);
  ctx.lineTo(width, sy);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = trace.color || '#fff';
  ctx.beginPath();
  ctx.arc(sx, sy, 6, 0, Math.PI * 2);
  ctx.fill();
}

export function exportCanvasPng(canvas) {
  const link = document.createElement('a');
  link.download = 'graph.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
