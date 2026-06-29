import { useMemo } from 'react';
import {
  XAxis, YAxis, Tooltip, ResponsiveContainer, Area, ComposedChart, Bar, ReferenceLine, ReferenceArea,
} from 'recharts';
import { formatPrice, formatVolume } from '@/lib/tools/stocks/stocks-format';

const UP = { stroke: '#4ade80', fill: 'rgba(74, 222, 128, 0.18)' };
const DOWN = { stroke: '#f87171', fill: 'rgba(248, 113, 113, 0.18)' };

export default function StocksChart({
  points = [], showVolume = true, height = 300, referencePrice, isUp, sessions, intraday,
}) {
  const data = useMemo(() => points.map((p) => ({ ...p })), [points]);

  const ref = referencePrice ?? data[0]?.open ?? data[0]?.close;
  const last = data[data.length - 1]?.close;
  const trendingUp = isUp ?? (last != null && ref != null ? last >= ref : true);
  const colors = trendingUp ? UP : DOWN;
  const xKey = intraday ? 'cx' : 'label';

  if (!data.length) {
    return <div className="stocks-chart-empty">No chart data available.</div>;
  }

  return (
    <div className={`stocks-chart stocks-chart--${trendingUp ? 'up' : 'down'}${intraday ? ' stocks-chart--intraday' : ''}`} style={{ height }}>
      {intraday && sessions && (
        <div className="stocks-chart-session-bg" aria-hidden>
          <span className="stocks-chart-session stocks-chart-session--pre" style={{ width: `${sessions.pre.end * 100}%` }} />
          <span className="stocks-chart-session stocks-chart-session--regular" style={{ left: `${sessions.regular.start * 100}%`, width: `${(sessions.regular.end - sessions.regular.start) * 100}%` }} />
          <span className="stocks-chart-session stocks-chart-session--after" style={{ left: `${sessions.after.start * 100}%`, width: `${(sessions.after.end - sessions.after.start) * 100}%` }} />
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="stocksChartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.stroke} stopOpacity={0.28} />
              <stop offset="100%" stopColor={colors.stroke} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {intraday && sessions && (
            <>
              <ReferenceArea x1={sessions.pre.start} x2={sessions.pre.end} yAxisId="price" fill="transparent" />
              <ReferenceArea x1={sessions.regular.start} x2={sessions.regular.end} yAxisId="price" fill="transparent" />
              <ReferenceArea x1={sessions.after.start} x2={sessions.after.end} yAxisId="price" fill="transparent" />
            </>
          )}
          <XAxis
            dataKey={xKey}
            type={intraday ? 'number' : 'category'}
            domain={intraday ? [0, 1] : undefined}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            interval="preserveStartEnd"
            minTickGap={48}
            tickFormatter={intraday ? (v) => {
              const pt = data.find((p) => Math.abs(p.cx - v) < 0.001) || data[Math.round(v * (data.length - 1))];
              return pt?.label || '';
            } : undefined}
          />
          <YAxis
            yAxisId="price"
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            tickFormatter={(v) => formatPrice(v).replace('$', '')}
            width={48}
          />
          {showVolume && <YAxis yAxisId="vol" orientation="right" hide />}
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ''}
            formatter={(value, name) => {
              if (name === 'volume') return [formatVolume(value), 'Volume'];
              return [formatPrice(value), 'Price'];
            }}
          />
          {ref != null && (
            <ReferenceLine
              yAxisId="price"
              y={ref}
              stroke="color-mix(in srgb, var(--text-muted) 55%, transparent)"
              strokeDasharray="4 4"
              label={{ value: 'Prev close', position: 'insideTopRight', fill: 'var(--text-muted)', fontSize: 10 }}
            />
          )}
          {showVolume && (
            <Bar yAxisId="vol" dataKey="volume" fill={colors.stroke} opacity={0.12} />
          )}
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="close"
            stroke={colors.stroke}
            fill="url(#stocksChartFill)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: colors.stroke }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
