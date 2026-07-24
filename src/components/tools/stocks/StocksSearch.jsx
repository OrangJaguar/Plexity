import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Search } from 'lucide-react';
import { searchSymbolsWithQuotes } from '@/lib/tools/stocks/stocks-provider';
import { clearRecentStocks, loadRecentStocks, trackRecentStock } from '@/lib/tools/stocks/stocks-model';
import { changeClass, formatChange, formatPrice } from '@/lib/tools/stocks/stocks-format';
import { useScopedToolRoutes } from '@/hooks/useScopedToolRoutes';

export default function StocksSearch({ className = '' }) {
  const navigate = useNavigate();
  const { stocksSymbolRoute } = useScopedToolRoutes();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recent, setRecent] = useState(loadRecentStocks);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      return undefined;
    }
    setLoading(true);
    timer.current = setTimeout(() => {
      void searchSymbolsWithQuotes(q)
        .then((rows) => { setResults(rows); setOpen(true); })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer.current);
  }, [query]);

  const go = (symbol, name) => {
    trackRecentStock(symbol, name);
    setRecent(loadRecentStocks());
    setOpen(false);
    setQuery('');
    navigate(stocksSymbolRoute(symbol));
  };

  const clearHistory = (e) => {
    e.stopPropagation();
    clearRecentStocks();
    setRecent([]);
  };

  const showRecent = open && !query.trim() && recent.length > 0;
  const showResults = open && query.trim() && (results.length > 0 || loading);

  return (
    <div className={`stocks-search ${className}`} ref={wrapRef}>
      <Search size={16} aria-hidden />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search ticker or company… (press /)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) go(results[0].symbol, results[0].name);
          if (e.key === 'Escape') setOpen(false);
        }}
      />
      {(showRecent || showResults) && (
        <ul className="stocks-search-results">
          {showRecent && (
            <>
              <li className="stocks-search-section-row">
                <span className="stocks-search-section-label"><Clock size={12} /> Recent</span>
                <button type="button" className="stocks-search-clear" onClick={clearHistory}>Clear all</button>
              </li>
              {recent.map((r) => (
                <li key={r.symbol}>
                  <SearchResultRow row={r} onClick={() => go(r.symbol, r.name)} />
                </li>
              ))}
            </>
          )}
          {showResults && loading && <li className="stocks-search-muted">Searching…</li>}
          {showResults && results.map((r) => (
            <li key={r.symbol}>
              <SearchResultRow row={r} onClick={() => go(r.symbol, r.name)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchResultRow({ row, onClick }) {
  return (
    <button type="button" className="stocks-search-row" onClick={onClick}>
      <span className="stocks-search-row-main">
        <strong>{row.symbol}</strong>
        <span className="stocks-search-row-name">{row.name}</span>
      </span>
      <span className="stocks-search-row-right">
        {row.price != null && <span className="stocks-search-row-price">{formatPrice(row.price)}</span>}
        {row.change != null && (
          <span className={`stocks-search-row-badge ${changeClass(row.change)}`}>
            {formatChange(row.change)}
          </span>
        )}
        <ChevronRight size={14} className="stocks-search-row-chevron" />
      </span>
    </button>
  );
}
