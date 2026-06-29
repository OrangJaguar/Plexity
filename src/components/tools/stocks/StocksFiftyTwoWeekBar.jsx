import { formatPrice } from '@/lib/tools/stocks/stocks-format';

export default function StocksFiftyTwoWeekBar({ price, low, high, className = '' }) {
  if (price == null || low == null || high == null || high <= low) {
    return <span className={`stocks-52wk stocks-52wk--empty ${className}`}>—</span>;
  }

  const pct = Math.max(0, Math.min(100, ((price - low) / (high - low)) * 100));

  return (
    <div className={`stocks-52wk ${className}`} title={`Price is at ${pct.toFixed(0)}% of the 52-week range (${formatPrice(low)} – ${formatPrice(high)})`}>
      <span className="stocks-52wk-caption">52-wk position</span>
      <div className="stocks-52wk-row">
        <div className="stocks-52wk-track">
          <span className="stocks-52wk-fill" style={{ width: `${pct}%` }} />
          <span className="stocks-52wk-marker" style={{ left: `${pct}%` }} />
        </div>
        <span className="stocks-52wk-label">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
