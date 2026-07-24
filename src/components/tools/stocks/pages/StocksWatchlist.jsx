import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Scale, Star, Trash2 } from 'lucide-react';
import { formatChange, formatPrice } from '@/lib/tools/stocks/stocks-format';
import { portfolioPl } from '@/lib/tools/stocks/stocks-model';
import { useWatchlistQuotes } from '@/hooks/queries/useStocksMarket';
import StocksFiftyTwoWeekBar from '@/components/tools/stocks/StocksFiftyTwoWeekBar';
import StocksSparkline from '@/components/tools/stocks/StocksSparkline';
import { StocksChange, StocksDataNotice, StocksLoader, StocksTable } from '@/components/tools/stocks/stocks-shared';
import { useScopedToolRoutes } from '@/hooks/useScopedToolRoutes';

export default function StocksWatchlist({ workspace, saveWorkspace, compare }) {
  const navigate = useNavigate();
  const { stocksSymbolRoute } = useScopedToolRoutes();
  const watchlist = workspace?.watchlist || [];
  const symbols = watchlist.map((w) => w.symbol);
  const quotes = useWatchlistQuotes(symbols);
  const [editingId, setEditingId] = useState(null);

  const quoteMap = useMemo(() => {
    const m = {};
    (quotes.data || []).forEach((q) => { m[q.symbol] = q; });
    return m;
  }, [quotes.data]);

  const remove = (id) => {
    saveWorkspace({ watchlist: watchlist.filter((w) => w.id !== id) });
  };

  const togglePriority = (id) => {
    saveWorkspace({
      watchlist: watchlist.map((w) => (w.id === id ? { ...w, priority: !w.priority } : w)),
    });
  };

  const updatePosition = (id, patch) => {
    saveWorkspace({
      watchlist: watchlist.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    });
  };

  const exportCsv = () => {
    const header = ['Symbol', 'Name', 'Price', 'Change%', '52Wk%', 'Shares', 'CostBasis', 'P/L', 'P/L%'];
    const lines = watchlist.map((w) => {
      const q = quoteMap[w.symbol];
      const pl = portfolioPl(w.shares, w.costBasis, q?.price);
      const low = q?.fiftyTwoWeekLow;
      const high = q?.fiftyTwoWeekHigh;
      const pos = q?.price != null && low != null && high != null && high > low
        ? (((q.price - low) / (high - low)) * 100).toFixed(1)
        : '';
      return [
        w.symbol, w.name || '', q?.price ?? '', q?.change ?? '', pos,
        w.shares ?? '', w.costBasis ?? '', pl?.pl ?? '', pl?.plPct != null ? pl.plPct.toFixed(2) : '',
      ].join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watchlist.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const rows = watchlist.map((w) => {
    const q = quoteMap[w.symbol];
    const note = workspace?.research?.[w.symbol];
    const pl = portfolioPl(w.shares, w.costBasis, q?.price);
    return {
      ...w,
      price: q?.price,
      change: q?.change,
      sparkline: q?.sparkline,
      fiftyTwoWeekLow: q?.fiftyTwoWeekLow,
      fiftyTwoWeekHigh: q?.fiftyTwoWeekHigh,
      notePreview: note?.thesis?.slice(0, 80) || w.note?.slice(0, 80) || '',
      pl,
    };
  }).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return a.order - b.order;
  });

  const columns = [
    {
      key: 'priority',
      label: '',
      render: (r) => (
        <button type="button" className={`stocks-priority-btn${r.priority ? ' is-on' : ''}`} onClick={(e) => { e.stopPropagation(); togglePriority(r.id); }}>
          <Star size={14} />
        </button>
      ),
    },
    { key: 'symbol', label: 'Ticker', render: (r) => <strong>{r.symbol}</strong> },
    { key: 'spark', label: '5D', render: (r) => <StocksSparkline data={r.sparkline} /> },
    { key: 'name', label: 'Company', render: (r) => <span className="stocks-muted">{r.name || '—'}</span> },
    { key: 'price', label: 'Price', align: 'right', render: (r) => formatPrice(r.price) },
    { key: 'change', label: 'Change', align: 'right', render: (r) => <StocksChange value={r.change} /> },
    {
      key: '52wk',
      label: '52-wk',
      render: (r) => <StocksFiftyTwoWeekBar price={r.price} low={r.fiftyTwoWeekLow} high={r.fiftyTwoWeekHigh} />,
    },
    {
      key: 'position',
      label: 'Position',
      render: (r) => editingId === r.id ? (
        <div className="stocks-position-edit" onClick={(e) => e.stopPropagation()}>
          <input type="number" placeholder="Shares" value={r.shares ?? ''} onChange={(e) => updatePosition(r.id, { shares: e.target.value ? Number(e.target.value) : null })} />
          <input type="number" step="0.01" placeholder="Cost" value={r.costBasis ?? ''} onChange={(e) => updatePosition(r.id, { costBasis: e.target.value ? Number(e.target.value) : null })} />
        </div>
      ) : (
        <button type="button" className="stocks-position-btn" onClick={(e) => { e.stopPropagation(); setEditingId(r.id); }}>
          {r.pl ? (
            <span className={r.pl.pl >= 0 ? 'stocks-change--up' : 'stocks-change--down'}>
              {formatChange(r.pl.plPct)} · {formatPrice(r.pl.value)}
            </span>
          ) : (
            <span className="stocks-muted">Add shares</span>
          )}
        </button>
      ),
    },
    { key: 'note', label: 'Note', render: (r) => r.notePreview ? <span className="stocks-note-preview">{r.notePreview}</span> : <span className="stocks-muted">—</span> },
    {
      key: 'actions',
      label: '',
      render: (r) => (
        <div className="stocks-row-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`stocks-btn stocks-btn--ghost stocks-btn--sm${compare?.isSelected(r.symbol) ? ' stocks-btn--primary' : ''}`}
            disabled={!compare?.isSelected(r.symbol) && !compare?.canAdd}
            onClick={() => compare?.toggle(r.symbol)}
            title="Add to compare"
          >
            <Scale size={12} />
          </button>
          <button type="button" className="stocks-icon-btn" onClick={() => remove(r.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="stocks-page">
      <header className="stocks-page-head">
        <h1>Watchlist</h1>
        <div className="stocks-page-head-actions">
          {watchlist.length > 0 && (
            <button type="button" className="stocks-btn stocks-btn--ghost stocks-btn--sm" onClick={exportCsv}>
              <Download size={14} /> Export CSV
            </button>
          )}
          <StocksDataNotice />
        </div>
      </header>

      {quotes.isLoading && watchlist.length > 0 && <StocksLoader />}

      {watchlist.length === 0 ? (
        <p className="stocks-muted stocks-empty">Your watchlist is empty. Add stocks from the screener or search.</p>
      ) : (
        <StocksTable
          columns={columns}
          rows={rows}
          onRowClick={(r) => navigate(stocksSymbolRoute(r.symbol))}
        />
      )}
    </div>
  );
}
