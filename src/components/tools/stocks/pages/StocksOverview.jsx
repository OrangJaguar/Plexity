import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { INDEX_SYMBOLS } from '@/lib/tools/stocks/stocks-model';
import { formatChange, formatDate, formatPrice } from '@/lib/tools/stocks/stocks-format';
import { useIndexQuotes, useMarketNews, useMovers, useStockSummary, useWatchlistQuotes } from '@/hooks/queries/useStocksMarket';
import StocksSectorHeatmap from '@/components/tools/stocks/StocksSectorHeatmap';
import {
  StocksChange, StocksDataNotice, StocksError, StocksKpi, StocksLoader, StocksPanel,
} from '@/components/tools/stocks/stocks-shared';
import { stocksRoute, stocksSymbolRoute } from '@/lib/tools/tool-routes';

export default function StocksOverview({ workspace, onOpenSymbol }) {
  const navigate = useNavigate();
  const indices = useIndexQuotes();
  const movers = useMovers();
  const news = useMarketNews();

  const watchlistSymbols = useMemo(
    () => (workspace?.watchlist || []).slice(0, 6).map((w) => w.symbol),
    [workspace],
  );
  const watchQuotes = useWatchlistQuotes(watchlistSymbols);
  const watchQuoteMap = useMemo(() => {
    const m = {};
    (watchQuotes.data || []).forEach((q) => { m[q.symbol] = q; });
    return m;
  }, [watchQuotes.data]);

  const open = (symbol) => {
    if (onOpenSymbol) onOpenSymbol(symbol);
    else navigate(stocksSymbolRoute(symbol));
  };

  return (
    <div className="stocks-page stocks-overview">
      <header className="stocks-page-head">
        <h1>Overview</h1>
        <StocksDataNotice />
      </header>

      <div className="stocks-index-row">
        {indices.isLoading && <StocksLoader />}
        {indices.isError && <StocksError onRetry={() => indices.refetch()} />}
        {INDEX_SYMBOLS.map(({ symbol, label }) => {
          const q = (indices.data || []).find((row) => row.symbol === symbol);
          if (!q && !indices.isLoading) return null;
          return (
            <StocksKpi
              key={symbol}
              label={label}
              value={q ? formatPrice(q.price) : '—'}
              sub={q ? formatChange(q.change) : ''}
              trend={q?.change}
            />
          );
        })}
      </div>

      <StocksPanel title="Sector performance" action={<span className="stocks-muted">1D via sector ETFs</span>}>
        <div className="stocks-panel-pad"><StocksSectorHeatmap /></div>
      </StocksPanel>

      <div className="stocks-overview-grid">
        <StocksPanel
          title="Watchlist"
          action={<Link to={stocksRoute('watchlist')} className="stocks-link">View all</Link>}
        >
          {(workspace?.watchlist || []).length === 0 ? (
            <p className="stocks-muted">Add symbols from the screener or search bar.</p>
          ) : (
            <ul className="stocks-compact-list">
              {workspace.watchlist.slice(0, 6).map((w) => {
                const q = watchQuoteMap[w.symbol];
                return (
                  <li key={w.id}>
                    <button type="button" className="stocks-compact-row" onClick={() => open(w.symbol)}>
                      <span>
                        <strong>{w.symbol}</strong>
                        {w.name && <span className="stocks-muted stocks-compact-name">{w.name}</span>}
                      </span>
                      <span className="stocks-compact-right">
                        <span>{formatPrice(q?.price)}</span>
                        <StocksChange value={q?.change} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </StocksPanel>

        <StocksPanel title="Gainers" action={movers.isLoading ? null : undefined}>
          {movers.isLoading ? <StocksLoader /> : (
            <MoverList rows={movers.data?.gainers} onOpen={open} />
          )}
        </StocksPanel>

        <StocksPanel title="Losers">
          {movers.isLoading ? <StocksLoader /> : (
            <MoverList rows={movers.data?.losers} onOpen={open} />
          )}
        </StocksPanel>

        <StocksPanel title="Most active">
          {movers.isLoading ? <StocksLoader /> : (
            <MoverList rows={movers.data?.active} onOpen={open} showVolume />
          )}
        </StocksPanel>

        <StocksPanel title="Market news" action={<span className="stocks-muted">Headlines</span>}>
          {news.isLoading ? <StocksLoader /> : (
            <ul className="stocks-news-list">
              {(news.data || []).slice(0, 8).map((n, i) => (
                <li key={i}>
                  <a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a>
                  <span className="stocks-news-meta">{n.publisher}</span>
                </li>
              ))}
            </ul>
          )}
        </StocksPanel>

        <StocksPanel title="Earnings preview" action={<Link to={stocksRoute('earnings')} className="stocks-link">Calendar</Link>}>
          {watchlistSymbols.length === 0 ? (
            <p className="stocks-muted">Add watchlist names to see upcoming earnings here.</p>
          ) : (
            <ul className="stocks-compact-list">
              {watchlistSymbols.map((sym) => (
                <EarningsPreviewRow key={sym} symbol={sym} onOpen={open} />
              ))}
            </ul>
          )}
        </StocksPanel>
      </div>
    </div>
  );
}

function EarningsPreviewRow({ symbol, onOpen }) {
  const { data, isLoading } = useStockSummary(symbol);
  if (isLoading) return <li><span className="stocks-muted stocks-panel-pad">Loading {symbol}…</span></li>;
  const next = data?.earnings?.nextDate;
  if (!next) {
    return (
      <li>
        <button type="button" className="stocks-compact-row" onClick={() => onOpen(symbol)}>
          <span><strong>{symbol}</strong><span className="stocks-muted stocks-compact-name">No date scheduled</span></span>
        </button>
      </li>
    );
  }
  return (
    <li>
      <button type="button" className="stocks-compact-row" onClick={() => onOpen(symbol)}>
        <span>
          <strong>{symbol}</strong>
          <span className="stocks-muted stocks-compact-name">{data.name}</span>
        </span>
        <span className="stocks-compact-right">
          <span>{formatDate(next)}</span>
          {data.earnings.epsAvg != null && <span className="stocks-muted">${data.earnings.epsAvg.toFixed(2)} est.</span>}
        </span>
      </button>
    </li>
  );
}

function MoverList({ rows = [], onOpen, showVolume }) {
  if (!rows?.length) return <p className="stocks-muted">No data.</p>;
  return (
    <ul className="stocks-compact-list">
      {rows.map((r) => (
        <li key={r.symbol}>
          <button type="button" className="stocks-compact-row" onClick={() => onOpen(r.symbol)}>
            <span>
              <strong>{r.symbol}</strong>
              <span className="stocks-muted stocks-compact-name">{r.name}</span>
            </span>
            <span className="stocks-compact-right">
              <span>{formatPrice(r.price)}</span>
              <StocksChange value={r.change} amount={r.changeAmount} />
              {showVolume && r.volume && <span className="stocks-muted">Vol {r.volume.toLocaleString()}</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
