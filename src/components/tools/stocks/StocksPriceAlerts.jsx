import { useMemo } from 'react';
import { formatPrice } from '@/lib/tools/stocks/stocks-format';
import { useWatchlistQuotes } from '@/hooks/queries/useStocksMarket';

export default function StocksPriceAlerts({ workspace, saveWorkspace }) {
  const alerts = workspace?.priceAlerts || [];
  const symbols = [...new Set(alerts.map((a) => a.symbol))];
  const quotes = useWatchlistQuotes(symbols);

  const triggered = useMemo(() => {
    const map = Object.fromEntries((quotes.data || []).map((q) => [q.symbol, q]));
    return alerts.filter((a) => {
      const q = map[a.symbol];
      if (!q?.price) return false;
      if (a.above != null && q.price >= a.above) return true;
      if (a.below != null && q.price <= a.below) return true;
      return false;
    });
  }, [alerts, quotes.data]);

  if (!triggered.length) return null;

  const dismiss = (id) => {
    saveWorkspace({ priceAlerts: alerts.filter((a) => a.id !== id) });
  };

  return (
    <div className="stocks-price-alerts">
      {triggered.map((a) => {
        const q = (quotes.data || []).find((x) => x.symbol === a.symbol);
        const dir = a.above != null && q?.price >= a.above ? 'above' : 'below';
        const target = dir === 'above' ? a.above : a.below;
        return (
          <div key={a.id} className="stocks-price-alert">
            <strong>{a.symbol}</strong>
            {' '}
            hit {dir} {formatPrice(target)} (now {formatPrice(q?.price)})
            <button type="button" className="stocks-btn stocks-btn--ghost stocks-btn--sm" onClick={() => dismiss(a.id)}>Dismiss</button>
          </div>
        );
      })}
    </div>
  );
}
