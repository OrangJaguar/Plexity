import { useMemo } from 'react';

const UP = '#4ade80';
const DOWN = '#f87171';

export default function StocksSparkline({ data = [], width = 72, height = 28, className = '' }) {
  const path = useMemo(() => {
    const pts = (data || []).filter((v) => v != null);
    if (pts.length < 2) return null;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const span = max - min || 1;
    const step = width / (pts.length - 1);
    return pts.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }, [data, width, height]);

  if (!path) return <span className={`stocks-sparkline stocks-sparkline--empty ${className}`}>—</span>;

  const up = data[data.length - 1] >= data[0];
  const color = up ? UP : DOWN;

  return (
    <svg className={`stocks-sparkline ${className}`} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
