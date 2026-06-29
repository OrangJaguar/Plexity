import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { fetchQuoteSummary } from '@/lib/tools/stocks/stocks-provider';
import {
  formatDate, formatMarketCap, formatPercent, formatPrice,
} from '@/lib/tools/stocks/stocks-format';
import { StocksChange, StocksLoader } from '@/components/tools/stocks/stocks-shared';

const METRICS = [
  { key: 'price', label: 'Price', fmt: (d) => formatPrice(d.price) },
  { key: 'change', label: '1D change', fmt: (d) => null, render: (d) => <StocksChange value={d.change} /> },
  { key: 'marketCap', label: 'Market cap', fmt: (d) => formatMarketCap(d.stats?.marketCap) },
  { key: 'pe', label: 'P/E', fmt: (d) => (d.stats?.pe != null ? d.stats.pe.toFixed(1) : '—') },
  { key: 'forwardPe', label: 'Forward P/E', fmt: (d) => (d.stats?.forwardPe != null ? d.stats.forwardPe.toFixed(1) : '—') },
  { key: 'eps', label: 'EPS', fmt: (d) => (d.stats?.eps != null ? `$${d.stats.eps.toFixed(2)}` : '—') },
  { key: 'beta', label: 'Beta', fmt: (d) => (d.stats?.beta != null ? d.stats.beta.toFixed(2) : '—') },
  { key: 'divYield', label: 'Div yield', fmt: (d) => (d.stats?.dividendYield != null ? formatPercent(d.stats.dividendYield) : '—') },
  { key: 'revenueGrowth', label: 'Rev growth', fmt: (d) => (d.stats?.revenueGrowth != null ? formatPercent(d.stats.revenueGrowth) : '—') },
  { key: 'grossMargins', label: 'Gross margin', fmt: (d) => (d.stats?.grossMargins != null ? formatPercent(d.stats.grossMargins) : '—') },
  { key: 'operatingMargins', label: 'Op margin', fmt: (d) => (d.stats?.operatingMargins != null ? formatPercent(d.stats.operatingMargins) : '—') },
  { key: 'roe', label: 'ROE', fmt: (d) => (d.stats?.returnOnEquity != null ? formatPercent(d.stats.returnOnEquity) : '—') },
  { key: 'target', label: 'Target price', fmt: (d) => formatPrice(d.stats?.targetMeanPrice) },
  { key: 'fiftyTwoWeek', label: '52-wk range', fmt: (d) => `${formatPrice(d.stats?.fiftyTwoWeekLow)} – ${formatPrice(d.stats?.fiftyTwoWeekHigh)}` },
  { key: 'nextEarnings', label: 'Next earnings', fmt: (d) => formatDate(d.earnings?.nextDate) },
];

export function StocksCompareBar({ symbols, onRemove, onOpen, onClear }) {
  if (!symbols?.length) return null;

  return (
    <div className="stocks-compare-bar">
      <span className="stocks-compare-bar-label">Compare</span>
      <div className="stocks-compare-bar-chips">
        {symbols.map((sym) => (
          <span key={sym} className="stocks-compare-chip">
            {sym}
            <button type="button" aria-label={`Remove ${sym}`} onClick={() => onRemove(sym)}>
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <button type="button" className="stocks-btn stocks-btn--primary stocks-btn--sm" disabled={symbols.length < 2} onClick={onOpen}>
        View ({symbols.length})
      </button>
      <button type="button" className="stocks-btn stocks-btn--ghost stocks-btn--sm" onClick={onClear}>Clear</button>
    </div>
  );
}

export function StocksCompareModal({ symbols, open, onClose }) {
  const queries = useQueries({
    queries: (symbols || []).map((sym) => ({
      queryKey: ['stocks', 'summary', sym],
      queryFn: () => fetchQuoteSummary(sym),
      staleTime: 300_000,
    })),
  });

  const rows = useMemo(() => {
    return (symbols || []).map((sym, i) => ({
      symbol: sym,
      data: queries[i]?.data,
      loading: queries[i]?.isLoading,
      error: queries[i]?.isError,
    }));
  }, [symbols, queries]);

  if (!open) return null;

  const loading = rows.some((r) => r.loading);

  return (
    <div className="stocks-compare-overlay" onClick={onClose} role="presentation">
      <div className="stocks-compare-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Compare stocks">
        <header className="stocks-compare-modal-head">
          <h2>Compare stocks</h2>
          <button type="button" className="stocks-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {loading ? (
          <StocksLoader />
        ) : (
          <div className="stocks-compare-table-wrap">
            <table className="stocks-compare-table">
              <thead>
                <tr>
                  <th>Metric</th>
                  {rows.map((r) => (
                    <th key={r.symbol}>
                      <strong>{r.symbol}</strong>
                      {r.data?.name && <span className="stocks-muted">{r.data.name}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    {rows.map((r) => (
                      <td key={r.symbol}>
                        {r.error ? '—' : m.render ? m.render(r.data || {}) : m.fmt(r.data || {})}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="stocks-muted stocks-compare-disclaimer">For research use · Data may be delayed</p>
      </div>
    </div>
  );
}

export function useCompareActions(workspace, saveWorkspace) {
  const symbols = workspace?.compareSymbols || [];
  const max = 4;

  const toggle = (symbol) => {
    const sym = symbol?.toUpperCase();
    if (!sym) return;
    if (symbols.includes(sym)) {
      saveWorkspace({ compareSymbols: symbols.filter((s) => s !== sym) });
    } else if (symbols.length < max) {
      saveWorkspace({ compareSymbols: [...symbols, sym] });
    }
  };

  const remove = (symbol) => {
    saveWorkspace({ compareSymbols: symbols.filter((s) => s !== symbol) });
  };

  const clear = () => saveWorkspace({ compareSymbols: [] });

  const isSelected = (symbol) => symbols.includes(symbol?.toUpperCase());

  return { symbols, toggle, remove, clear, isSelected, canAdd: symbols.length < max };
}
