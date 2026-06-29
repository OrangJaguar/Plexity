import { formatPrice } from '@/lib/tools/stocks/stocks-format';

function ratingLabel(rating) {
  if (!rating) return null;
  const map = { buy: 'Buy', strong_buy: 'Strong buy', hold: 'Hold', sell: 'Sell', strong_sell: 'Sell', underperform: 'Underperform', outperform: 'Outperform' };
  return map[rating] || rating.replace(/_/g, ' ');
}

export default function StocksAnalystConsensus({ consensus, currentPrice }) {
  if (!consensus?.total) return null;

  const { bullish, neutral, bearish, total, targetLow, targetHigh, targetMean, analysts, rating } = consensus;
  const low = targetLow ?? currentPrice;
  const high = targetHigh ?? currentPrice;
  const mean = targetMean ?? currentPrice;
  const span = high - low || 1;
  const pct = (v) => Math.max(0, Math.min(100, ((v - low) / span) * 100));

  return (
    <div className="stocks-consensus">
      <div className="stocks-consensus-head">
        {rating && <span className="stocks-consensus-badge">{ratingLabel(rating)}</span>}
        {analysts && <span className="stocks-muted">{analysts} analysts</span>}
      </div>

      <div className="stocks-consensus-bars">
        <div className="stocks-consensus-counts">
          <span className="stocks-change--down">{bearish} bearish</span>
          <span>{neutral} neutral</span>
          <span className="stocks-change--up">{bullish} bullish</span>
        </div>
        <div className="stocks-consensus-segments" aria-hidden>
          {Array.from({ length: Math.min(total, 20) }).map((_, i) => {
            const idx = i / Math.min(total, 20);
            let tone = 'neutral';
            if (idx < bearish / total) tone = 'bear';
            else if (idx < (bearish + neutral) / total) tone = 'neutral';
            else tone = 'bull';
            return <span key={i} className={`stocks-consensus-seg stocks-consensus-seg--${tone}`} />;
          })}
        </div>
      </div>

      {(targetLow != null || targetHigh != null) && (
        <div className="stocks-consensus-targets">
          <div className="stocks-consensus-target-labels">
            <div><strong>{formatPrice(low)}</strong><span>Low</span></div>
            <div><strong>{formatPrice(mean)}</strong><span>Avg target</span></div>
            <div><strong>{formatPrice(currentPrice)}</strong><span>Current</span></div>
            <div><strong>{formatPrice(high)}</strong><span>High</span></div>
          </div>
          <div className="stocks-consensus-track">
            <div className="stocks-consensus-track-fill" />
            {targetLow != null && <span className="stocks-consensus-dot stocks-consensus-dot--low" style={{ left: `${pct(low)}%` }} />}
            {targetMean != null && <span className="stocks-consensus-dot stocks-consensus-dot--mean" style={{ left: `${pct(mean)}%` }} />}
            {currentPrice != null && <span className="stocks-consensus-dot stocks-consensus-dot--now" style={{ left: `${pct(currentPrice)}%` }} />}
            {targetHigh != null && <span className="stocks-consensus-dot stocks-consensus-dot--high" style={{ left: `${pct(high)}%` }} />}
          </div>
        </div>
      )}
    </div>
  );
}
