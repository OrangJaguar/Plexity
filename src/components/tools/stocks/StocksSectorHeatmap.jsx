import { changeClass } from '@/lib/tools/stocks/stocks-format';
import { useSectorPerformance } from '@/hooks/queries/useStocksMarket';
import { StocksLoader } from '@/components/tools/stocks/stocks-shared';

export default function StocksSectorHeatmap() {
  const sectors = useSectorPerformance();

  if (sectors.isLoading) return <StocksLoader />;
  if (!sectors.data?.length) return null;

  return (
    <div className="stocks-sector-heatmap">
      {sectors.data.map((s) => (
        <div
          key={s.symbol}
          className={`stocks-sector-tile${s.change != null ? ` ${changeClass(s.change)}` : ''}`}
          title={`${s.sector} (${s.symbol})`}
        >
          <span className="stocks-sector-tile-name">{s.sector}</span>
          <span className="stocks-sector-tile-change">
            {s.change != null ? `${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
