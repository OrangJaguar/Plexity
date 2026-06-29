import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TypingGraph({ series }) {
  const [hovered, setHovered] = useState(null);

  const layout = useMemo(() => {
    if (!series.length) return null;

    const width = 640;
    const height = 220;
    const pad = { top: 28, right: 20, bottom: 36, left: 44 };
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const maxWpm = Math.max(20, ...series.map((p) => Math.max(p.netWpm, p.rawWpm)));
    const maxSec = series[series.length - 1].second;
    const colW = innerW / Math.max(1, maxSec);

    const x = (sec) => pad.left + ((sec - 0.5) / maxSec) * innerW;
    const y = (wpm) => pad.top + innerH - (wpm / maxWpm) * innerH;

    return {
      width,
      height,
      pad,
      innerW,
      innerH,
      maxWpm,
      maxSec,
      colW,
      x,
      y,
    };
  }, [series]);

  if (!layout) {
    return <div className="tools-typing-graph tools-typing-graph--empty">Not enough data for graph</div>;
  }

  const {
    width,
    height,
    pad,
    innerH,
    maxWpm,
    maxSec,
    colW,
    x,
    y,
  } = layout;

  const toPath = (key) => series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.second).toFixed(1)},${y(p[key]).toFixed(1)}`)
    .join(' ');

  const tickSeconds = series.filter(
    (_, i) => i % Math.max(1, Math.floor(series.length / 8)) === 0 || i === series.length - 1,
  );

  const tooltip = hovered != null ? series[hovered] : null;
  const tooltipX = tooltip ? x(tooltip.second) : 0;

  return (
    <div className="tools-typing-graph-interactive">
      <svg
        className="tools-typing-graph"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="WPM over time chart"
      >
        <text
          x={pad.left - 8}
          y={pad.top + innerH / 2}
          className="tools-typing-graph-axis-title"
          textAnchor="middle"
          transform={`rotate(-90 ${pad.left - 8} ${pad.top + innerH / 2})`}
        >
          words per minute
        </text>

        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const yy = pad.top + innerH * (1 - t);
          const val = Math.round(maxWpm * t);
          return (
            <g key={t}>
              <line
                x1={pad.left}
                y1={yy}
                x2={width - pad.right}
                y2={yy}
                className="tools-typing-graph-grid"
              />
              <text x={6} y={yy + 4} className="tools-typing-graph-axis-label">{val}</text>
            </g>
          );
        })}

        <path d={toPath('rawWpm')} className="tools-typing-graph-line tools-typing-graph-line--raw" fill="none" />
        <path d={toPath('netWpm')} className="tools-typing-graph-line tools-typing-graph-line--net" fill="none" />

        {series.map((p, i) => (
          p.errors > 0 ? (
            <text
              key={`err-${p.second}`}
              x={x(p.second)}
              y={pad.top + 12}
              className="tools-typing-graph-error"
            >
              ×
            </text>
          ) : null
        ))}

        {series.map((p, i) => (
          <rect
            key={`hover-${p.second}`}
            x={x(p.second) - colW / 2}
            y={pad.top}
            width={colW}
            height={innerH}
            className="tools-typing-graph-hover-zone"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}

        {hovered != null && (
          <line
            x1={tooltipX}
            y1={pad.top}
            x2={tooltipX}
            y2={pad.top + innerH}
            className="tools-typing-graph-hover-line"
          />
        )}

        {tickSeconds.map((p) => (
          <text
            key={`tick-${p.second}`}
            x={x(p.second)}
            y={height - 14}
            className="tools-typing-graph-axis-label"
            textAnchor="middle"
          >
            {p.second}
          </text>
        ))}

        <text
          x={pad.left + (width - pad.left - pad.right) / 2}
          y={height - 2}
          className="tools-typing-graph-axis-title"
          textAnchor="middle"
        >
          seconds
        </text>
      </svg>

      {tooltip && (
        <div
          className="tools-typing-graph-tooltip"
          style={{
            left: `${(tooltipX / width) * 100}%`,
          }}
        >
          <div className="tools-typing-graph-tooltip-title">{tooltip.second}</div>
          <div className="tools-typing-graph-tooltip-row">
            <span className="tools-typing-graph-tooltip-swatch tools-typing-graph-tooltip-swatch--error" />
            errors: {tooltip.errors}
          </div>
          <div className="tools-typing-graph-tooltip-row">
            <span className="tools-typing-graph-tooltip-swatch tools-typing-graph-tooltip-swatch--net" />
            wpm: {tooltip.netWpm}
          </div>
          <div className="tools-typing-graph-tooltip-row">
            <span className="tools-typing-graph-tooltip-swatch tools-typing-graph-tooltip-swatch--raw" />
            raw: {tooltip.rawWpm}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TypingResults({ results, onRestart }) {
  const {
    wpm,
    rawWpm,
    accuracy,
    peakWpm,
    consistency,
    chars,
    elapsedMs,
    series,
    mode,
    count,
  } = results;

  const testLabel = mode === 'time' ? `time ${count}` : `words ${count}`;

  return (
    <div className="tools-typing-results">
      <div className="tools-typing-results-graph-wrap">
        <div className="tools-typing-graph-overlay">
          <div className="tools-typing-graph-overlay-left">
            <div className="tools-typing-graph-stat">
              <span className="tools-typing-graph-stat-label">wpm</span>
              <span className="tools-typing-graph-stat-value">{wpm}</span>
            </div>
            <div className="tools-typing-graph-stat">
              <span className="tools-typing-graph-stat-label">acc</span>
              <span className="tools-typing-graph-stat-value">{accuracy}%</span>
            </div>
          </div>
          <div className="tools-typing-graph-overlay-right">
            <span className="tools-typing-graph-test-type">{testLabel}</span>
          </div>
        </div>

        <TypingGraph series={series} />
      </div>

      <div className="tools-typing-results-grid">
        <div className="tools-typing-results-stat">
          <span className="tools-typing-results-label">raw</span>
          <span className="tools-typing-results-value tools-typing-results-value--sm">{rawWpm}</span>
        </div>
        <div className="tools-typing-results-stat">
          <span className="tools-typing-results-label">consistency</span>
          <span className="tools-typing-results-value tools-typing-results-value--sm">{consistency}%</span>
        </div>
        <div className="tools-typing-results-stat">
          <span className="tools-typing-results-label">peak</span>
          <span className="tools-typing-results-value tools-typing-results-value--sm">{peakWpm}</span>
        </div>
        <div className="tools-typing-results-stat">
          <span className="tools-typing-results-label">{mode === 'time' ? 'time' : 'words'}</span>
          <span className="tools-typing-results-value tools-typing-results-value--sm">
            {mode === 'time' ? `${count}s` : count}
            <span className="tools-typing-results-sub"> · {formatElapsed(elapsedMs)}</span>
          </span>
        </div>
        <div className="tools-typing-results-stat tools-typing-results-stat--wide">
          <span className="tools-typing-results-label">characters</span>
          <span className="tools-typing-results-value tools-typing-results-value--sm">
            {chars.correct}
            /
            {chars.incorrect}
            /
            {chars.extra}
            /
            {chars.missed}
          </span>
        </div>
      </div>

      <button type="button" className="tools-typing-restart-btn" onClick={onRestart}>
        <RotateCcw size={18} />
        <span>try again</span>
      </button>
    </div>
  );
}
