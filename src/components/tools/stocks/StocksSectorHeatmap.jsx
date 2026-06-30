import { changeClass } from '@/lib/tools/stocks/stocks-format';
import { SECTOR_ETFS } from '@/lib/tools/stocks/stocks-provider';
import { useSectorPerformance } from '@/hooks/queries/useStocksMarket';
import { StocksError, StocksLoader } from '@/components/tools/stocks/stocks-shared';

export default function StocksSectorHeatmap() {
  const sectors = useSectorPerformance();

  if (sectors.isLoading) return <StocksLoader />;
  if (sectors.isError) {
    return <StocksError message="Sector data unavailable" onRetry={() => sectors.refetch()} />;
  }

  const rows = sectors.data?.length
    ? sectors.data
    : SECTOR_ETFS.map(({ sector, symbol }) => ({ sector, symbol, change: null, price: null }));

  return (
    <div className="stocks-sector-heatmap">
      {rows.map((s) => (
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
