import { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter,
} from 'recharts';
import {
  mean, stdev, median, quartiles, normalPdf, probabilityBetween, histogramBins, linearRegression, parseCsvColumn,
} from '@/lib/tools/calculator/stats/stats-engine';

export default function StatsWorkspace({ stats, onUpdateStats }) {
  const [csvInput, setCsvInput] = useState('');
  const dataset = stats?.dataset || [];
  const params = stats?.params || { mean: 0, stdev: 1 };
  const distribution = stats?.distribution || 'normal';

  const summary = useMemo(() => {
    if (!dataset.length) return null;
    const q = quartiles(dataset);
    return { mean: mean(dataset), stdev: stdev(dataset), median: median(dataset), ...q };
  }, [dataset]);

  const normalCurve = useMemo(() => {
    const pts = [];
    for (let i = -4; i <= 4; i += 0.25) {
      const x = params.mean + i * params.stdev;
      pts.push({ x, y: normalPdf(x, params.mean, params.stdev) });
    }
    return pts;
  }, [params]);

  const hist = useMemo(() => histogramBins(dataset), [dataset]);

  const scatter = useMemo(() => dataset.map((v, i) => ({ x: i, y: v })), [dataset]);
  const regression = useMemo(() => {
    const xs = dataset.map((_, i) => i);
    return linearRegression(xs, dataset);
  }, [dataset]);

  const prob = probabilityBetween(distribution, params.mean - params.stdev, params.mean + params.stdev, params);

  return (
    <div className="calc-stats">
      <aside className="calc-stats-sidebar">
        <h3>Statistics</h3>
        <label>
          Distribution
          <select value={distribution} onChange={(e) => onUpdateStats({ distribution: e.target.value })}>
            <option value="normal">Normal</option>
            <option value="binomial">Binomial</option>
            <option value="poisson">Poisson</option>
            <option value="uniform">Uniform</option>
          </select>
        </label>
        <label>Mean <input type="number" value={params.mean} onChange={(e) => onUpdateStats({ params: { ...params, mean: Number(e.target.value) } })} /></label>
        <label>Stdev <input type="number" value={params.stdev} onChange={(e) => onUpdateStats({ params: { ...params, stdev: Number(e.target.value) } })} /></label>
        <p>P(μ−σ &lt; X &lt; μ+σ) ≈ {prob.toFixed(4)}</p>
        <textarea
          placeholder="Paste CSV data…"
          value={csvInput}
          onChange={(e) => setCsvInput(e.target.value)}
          onBlur={() => onUpdateStats({ dataset: parseCsvColumn(csvInput) })}
        />
        {summary ? (
          <dl className="calc-stats-summary">
            <dt>Mean</dt><dd>{summary.mean.toFixed(4)}</dd>
            <dt>Stdev</dt><dd>{summary.stdev.toFixed(4)}</dd>
            <dt>Median</dt><dd>{summary.median.toFixed(4)}</dd>
            <dt>Q1 / Q3</dt><dd>{summary.q1.toFixed(2)} / {summary.q3.toFixed(2)}</dd>
          </dl>
        ) : null}
        {regression ? <p>Linear r² = {regression.r2.toFixed(4)}</p> : null}
      </aside>
      <div className="calc-stats-plots">
        <div className="calc-stats-plot">
          <h4>Normal PDF</h4>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={normalCurve}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="y" stroke="#3b82f6" fill="rgba(59,130,246,0.3)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {hist.length ? (
          <div className="calc-stats-plot">
            <h4>Histogram</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hist.map((b) => ({ name: b.start.toFixed(1), count: b.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        {scatter.length ? (
          <div className="calc-stats-plot">
            <h4>Scatter</h4>
            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis dataKey="x" type="number" />
                <YAxis dataKey="y" type="number" />
                <Tooltip />
                <Scatter data={scatter} fill="#a855f7" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </div>
    </div>
  );
}
