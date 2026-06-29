import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Route, Routes, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { STOCKS_SECTIONS } from '@/lib/tools/stocks/stocks-model';
import { normalizeStocksWorkspace } from '@/lib/tools/stocks/stocks-model';
import { useToolsStocksWorkspace, useSaveStocksWorkspace } from '@/hooks/queries/useToolsStocksWorkspace';
import { useStocksRefreshStatus } from '@/hooks/useStocksRefreshStatus';
import { useIndexQuotes } from '@/hooks/queries/useStocksMarket';
import StocksSearch from '@/components/tools/stocks/StocksSearch';
import StocksPriceAlerts from '@/components/tools/stocks/StocksPriceAlerts';
import { StocksCompareBar, StocksCompareModal, useCompareActions } from '@/components/tools/stocks/StocksCompare';
import StocksOverview from '@/components/tools/stocks/pages/StocksOverview';
import StocksScreener from '@/components/tools/stocks/pages/StocksScreener';
import StocksWatchlist from '@/components/tools/stocks/pages/StocksWatchlist';
import StocksResearch from '@/components/tools/stocks/pages/StocksResearch';
import StocksEarnings from '@/components/tools/stocks/pages/StocksEarnings';
import StockDetailPage from '@/components/tools/stocks/StockDetailPage';

export default function StocksWorkspace() {
  const { data, isLoading } = useToolsStocksWorkspace();
  const saveMutation = useSaveStocksWorkspace();
  const [workspace, setWorkspace] = useState(() => normalizeStocksWorkspace(data));
  const saveTimer = useRef(null);

  useEffect(() => {
    if (data) setWorkspace(normalizeStocksWorkspace(data));
  }, [data]);

  const saveWorkspace = useCallback((patch) => {
    setWorkspace((prev) => {
      const next = normalizeStocksWorkspace({ ...prev, ...patch, updatedAt: Date.now() });
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveMutation.mutateAsync(next);
      }, 600);
      return next;
    });
  }, [saveMutation]);

  const compare = useCompareActions(workspace, saveWorkspace);
  const [compareOpen, setCompareOpen] = useState(false);
  const refresh = useStocksRefreshStatus();
  useIndexQuotes();

  if (isLoading) {
    return <div className="stocks-workspace stocks-workspace--loading">Loading workspace…</div>;
  }

  return (
    <div className="stocks-workspace">
      <aside className="stocks-workspace-nav">
        <div className="stocks-workspace-brand">
          <span className="stocks-workspace-title" title="Market data refresh cadence: ~2 min during hours, ~15 min after close">
            {refresh.label}
          </span>
          {saveMutation.isPending && (
            <span className="stocks-save-indicator"><Loader2 size={12} className="spin" /> Saving</span>
          )}
        </div>
        <nav className="stocks-nav">
          {STOCKS_SECTIONS.map((s) => (
            <NavLink
              key={s.id}
              to={s.path ? `/tools/stocks/${s.path}` : '/tools/stocks'}
              end={!s.path}
              className={({ isActive }) => `stocks-nav-item${isActive ? ' is-active' : ''}`}
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="stocks-workspace-main">
        <div className="stocks-workspace-search-row">
          <StocksSearch />
          <StocksPriceAlerts workspace={workspace} saveWorkspace={saveWorkspace} />
        </div>
        <Routes>
          <Route index element={<StocksOverview workspace={workspace} />} />
          <Route path="screener" element={<StocksScreener workspace={workspace} saveWorkspace={saveWorkspace} compare={compare} />} />
          <Route path="watchlist" element={<StocksWatchlist workspace={workspace} saveWorkspace={saveWorkspace} compare={compare} />} />
          <Route path="research" element={<StocksResearch workspace={workspace} saveWorkspace={saveWorkspace} />} />
          <Route path="earnings" element={<StocksEarnings workspace={workspace} />} />
          <Route path="symbol/:symbol" element={<StockDetailRoute workspace={workspace} saveWorkspace={saveWorkspace} compare={compare} />} />
        </Routes>
      </div>

      <StocksCompareBar
        symbols={compare.symbols}
        onRemove={compare.remove}
        onOpen={() => setCompareOpen(true)}
        onClear={compare.clear}
      />
      <StocksCompareModal symbols={compare.symbols} open={compareOpen} onClose={() => setCompareOpen(false)} />
    </div>
  );
}

function StockDetailRoute({ workspace, saveWorkspace, compare }) {
  const { symbol } = useParams();
  return <StockDetailPage symbol={symbol} workspace={workspace} saveWorkspace={saveWorkspace} compare={compare} />;
}
