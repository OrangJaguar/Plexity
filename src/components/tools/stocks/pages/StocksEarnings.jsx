import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/tools/stocks/stocks-format';
import { useStockSummary } from '@/hooks/queries/useStocksMarket';
import { StocksDataNotice, StocksLoader } from '@/components/tools/stocks/stocks-shared';

function EarningsRow({ symbol, onOpen }) {
  const { data, isLoading } = useStockSummary(symbol);
  if (isLoading) return <tr><td colSpan={4}><StocksLoader /></td></tr>;
  if (!data?.earnings?.nextDate) return null;

  const next = data.earnings.nextDate;
  const now = Date.now() / 1000;
  const week = now + 7 * 86400;
  if (next < now - 86400 || next > week) return null;

  return (
    <tr className="stocks-table-row--click" onClick={() => onOpen(symbol)}>
      <td><strong>{symbol}</strong></td>
      <td>{data.name}</td>
      <td>{formatDate(next)}</td>
      <td>{data.earnings.epsAvg != null ? `$${data.earnings.epsAvg.toFixed(2)} est.` : '—'}</td>
    </tr>
  );
}

export default function StocksEarnings({ workspace }) {
  const navigate = useNavigate();
  const [scope, setScope] = useState('watchlist');
  const symbols = useMemo(() => {
    if (scope === 'watchlist') return (workspace?.watchlist || []).map((w) => w.symbol);
    return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'UNH'];
  }, [scope, workspace]);

  const open = (sym) => navigate(`/tools/stocks/symbol/${encodeURIComponent(sym)}?tab=earnings`);

  return (
    <div className="stocks-page">
      <header className="stocks-page-head">
        <h1>Earnings calendar</h1>
        <StocksDataNotice />
      </header>

      <div className="stocks-earnings-tabs">
        <button type="button" className={scope === 'watchlist' ? 'is-active' : ''} onClick={() => setScope('watchlist')}>Watchlist</button>
        <button type="button" className={scope === 'popular' ? 'is-active' : ''} onClick={() => setScope('popular')}>Popular</button>
      </div>

      <p className="stocks-muted">Upcoming earnings within the next 7 days.</p>

      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              <th>Date</th>
              <th>EPS estimate</th>
            </tr>
          </thead>
          <tbody>
            {symbols.length === 0 ? (
              <tr><td colSpan={4} className="stocks-table-empty">Add stocks to your watchlist to track earnings.</td></tr>
            ) : symbols.map((sym) => (
              <EarningsRow key={sym} symbol={sym} onOpen={open} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
