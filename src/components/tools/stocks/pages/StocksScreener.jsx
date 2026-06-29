import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Scale, SlidersHorizontal } from 'lucide-react';
import { SCREENER_SECTORS } from '@/lib/tools/stocks/stocks-provider';
import { formatChange, formatMarketCap, formatPrice } from '@/lib/tools/stocks/stocks-format';
import { useScreener } from '@/hooks/queries/useStocksMarket';
import { loadScreenerPresets, newWatchlistItem } from '@/lib/tools/stocks/stocks-model';
import {
  StocksChange, StocksDataNotice, StocksError, StocksLoader, StocksTable,
} from '@/components/tools/stocks/stocks-shared';
import { stocksSymbolRoute } from '@/lib/tools/tool-routes';

const DEFAULT_FILTERS = {
  sector: 'all',
  exchange: 'all',
  minMarketCap: '',
  maxMarketCap: '',
  minPrice: '',
  maxPrice: '',
  minVolume: '',
  minPe: '',
  maxPe: '',
  minDivYield: '',
  sortField: 'percentchange',
  sortType: 'DESC',
};

function sortRows(rows, sortKey, sortDir) {
  if (!sortKey || !rows?.length) return rows || [];
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'string') return dir * av.localeCompare(bv);
    return dir * (av - bv);
  });
}

export default function StocksScreener({ workspace, saveWorkspace, compare }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [applied, setApplied] = useState(() => ({ ...DEFAULT_FILTERS }));
  const [tableSort, setTableSort] = useState({ key: null, dir: 'desc' });
  const [rowIndex, setRowIndex] = useState(0);
  const presets = useMemo(() => loadScreenerPresets(), []);

  const handleSort = (key) => {
    setTableSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' };
      return { key, dir: 'desc' };
    });
  };

  const apiFilters = useMemo(() => ({
    sector: applied.sector,
    exchange: applied.exchange,
    minMarketCap: applied.minMarketCap ? Number(applied.minMarketCap) : undefined,
    maxMarketCap: applied.maxMarketCap ? Number(applied.maxMarketCap) : undefined,
    minPrice: applied.minPrice ? Number(applied.minPrice) : undefined,
    maxPrice: applied.maxPrice ? Number(applied.maxPrice) : undefined,
    minVolume: applied.minVolume ? Number(applied.minVolume) : undefined,
    minPe: applied.minPe ? Number(applied.minPe) : undefined,
    maxPe: applied.maxPe ? Number(applied.maxPe) : undefined,
    minDivYield: applied.minDivYield ? Number(applied.minDivYield) : undefined,
    sortField: applied.sortField,
    sortType: applied.sortType,
  }), [applied]);

  const screener = useScreener(apiFilters);
  const sortedRows = useMemo(
    () => sortRows(screener.data, tableSort.key, tableSort.dir),
    [screener.data, tableSort],
  );
  const watchSet = useMemo(
    () => new Set((workspace?.watchlist || []).map((w) => w.symbol)),
    [workspace],
  );

  const addWatch = (row) => {
    if (watchSet.has(row.symbol)) return;
    const item = newWatchlistItem(row.symbol, row.name);
    saveWorkspace({ watchlist: [...(workspace.watchlist || []), item] });
  };

  const applyPreset = (preset) => {
    const next = { ...DEFAULT_FILTERS, ...preset.filters };
    setFilters(next);
    setApplied(next);
    setRowIndex(0);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!sortedRows.length || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'j') {
        e.preventDefault();
        setRowIndex((i) => Math.min(i + 1, sortedRows.length - 1));
      }
      if (e.key === 'k') {
        e.preventDefault();
        setRowIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && sortedRows[rowIndex]) {
        navigate(stocksSymbolRoute(sortedRows[rowIndex].symbol));
      }
      if (e.key === 'w' && sortedRows[rowIndex]) {
        addWatch(sortedRows[rowIndex]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sortedRows, rowIndex, navigate, watchSet, workspace]);

  const columns = [
    {
      key: 'symbol',
      label: 'Ticker',
      render: (r) => <strong>{r.symbol}</strong>,
    },
    {
      key: 'name',
      label: 'Company',
      render: (r) => <span className="stocks-muted stocks-cell-name">{r.name}</span>,
    },
    {
      key: 'price',
      label: 'Price',
      align: 'right',
      sortable: true,
      sortKey: 'price',
      render: (r) => formatPrice(r.price),
    },
    {
      key: 'change',
      label: 'Change',
      align: 'right',
      sortable: true,
      sortKey: 'change',
      render: (r) => <StocksChange value={r.change} />,
    },
    {
      key: 'marketCap',
      label: 'Mkt cap',
      align: 'right',
      sortable: true,
      sortKey: 'marketCap',
      render: (r) => formatMarketCap(r.marketCap),
    },
    {
      key: 'pe',
      label: 'P/E',
      align: 'right',
      render: (r) => (r.pe != null ? r.pe.toFixed(1) : '—'),
    },
    {
      key: 'sector',
      label: 'Sector',
      render: (r) => r.sector || '—',
    },
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
          <button type="button" className="stocks-btn stocks-btn--ghost stocks-btn--sm" disabled={watchSet.has(r.symbol)} onClick={() => addWatch(r)}>
            <Plus size={12} /> {watchSet.has(r.symbol) ? 'Added' : 'Watch'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="stocks-page">
      <header className="stocks-page-head">
        <h1>Screener</h1>
        <StocksDataNotice />
      </header>

      <div className="stocks-screener-presets">
        {presets.map((p) => (
          <button key={p.id} type="button" className="stocks-preset-chip" onClick={() => applyPreset(p)}>
            {p.name}
          </button>
        ))}
        <span className="stocks-muted stocks-screener-hint">j/k navigate · Enter open · w watchlist</span>
      </div>

      <div className="stocks-screener-filters">
        <div className="stocks-filter-grid">
          <label>
            Sector
            <select value={filters.sector} onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}>
              <option value="all">All sectors</option>
              {SCREENER_SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Min price
            <input type="number" placeholder="0" value={filters.minPrice} onChange={(e) => setFilters((f) => ({ ...f, minPrice: e.target.value }))} />
          </label>
          <label>
            Max price
            <input type="number" placeholder="∞" value={filters.maxPrice} onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))} />
          </label>
          <label>
            Min mkt cap (B)
            <input type="number" placeholder="e.g. 1" value={filters.minMarketCap ? filters.minMarketCap / 1e9 : ''} onChange={(e) => setFilters((f) => ({ ...f, minMarketCap: e.target.value ? Number(e.target.value) * 1e9 : '' }))} />
          </label>
          <label>
            Min volume
            <input type="number" placeholder="0" value={filters.minVolume} onChange={(e) => setFilters((f) => ({ ...f, minVolume: e.target.value }))} />
          </label>
          <label>
            P/E min
            <input type="number" value={filters.minPe} onChange={(e) => setFilters((f) => ({ ...f, minPe: e.target.value }))} />
          </label>
          <label>
            P/E max
            <input type="number" value={filters.maxPe} onChange={(e) => setFilters((f) => ({ ...f, maxPe: e.target.value }))} />
          </label>
          <label>
            Min div yield %
            <input type="number" step="0.1" value={filters.minDivYield} onChange={(e) => setFilters((f) => ({ ...f, minDivYield: e.target.value }))} />
          </label>
        </div>
        <div className="stocks-filter-actions">
          <button type="button" className="stocks-btn stocks-btn--primary" onClick={() => setApplied({ ...filters })}>
            <SlidersHorizontal size={14} /> Run screener
          </button>
          <button type="button" className="stocks-btn stocks-btn--ghost" onClick={() => { setFilters(DEFAULT_FILTERS); setApplied({ ...DEFAULT_FILTERS }); }}>
            Clear filters
          </button>
          <span className="stocks-muted">
            {screener.data?.length ?? 0}
            {' '}
            results
          </span>
        </div>
      </div>

      {screener.isLoading && <StocksLoader />}
      {screener.isError && <StocksError onRetry={() => screener.refetch()} />}
      {screener.data && (
        <StocksTable
          columns={columns}
          rows={sortedRows}
          sortKey={tableSort.key}
          sortDir={tableSort.dir}
          onSort={handleSort}
          highlightIndex={rowIndex}
          onRowClick={(r) => navigate(stocksSymbolRoute(r.symbol))}
        />
      )}
    </div>
  );
}
