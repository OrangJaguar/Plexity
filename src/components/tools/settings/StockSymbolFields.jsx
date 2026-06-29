import { useEffect, useRef, useState } from 'react';
import { searchStockSymbols } from '@/lib/tools/stock-api';

function useDebouncedValue(value, ms = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

function StockSlotInput({ index, value, onChange, label }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const ref = useRef(null);
  const debounced = useDebouncedValue(query);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!open || debounced.trim().length < 1) {
      setResults([]);
      setNotFound(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    searchStockSymbols(debounced)
      .then((hits) => {
        if (cancelled) return;
        setResults(hits);
        setNotFound(hits.length === 0);
      })
      .catch(() => {
        if (!cancelled) {
          setResults([]);
          setNotFound(true);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, open]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (hit) => {
    onChange(hit.symbol);
    setQuery(hit.symbol);
    setOpen(false);
  };

  const clear = () => {
    onChange('');
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="tools-widget-autocomplete tools-widget-stock-slot" ref={ref}>
      <label className="tools-widget-inline-field">
        {label}
        <div className="tools-widget-stock-input-row">
          <input
            className="tools-settings-input"
            type="text"
            placeholder="e.g. AAPL"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value.toUpperCase());
              setOpen(true);
              setNotFound(false);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              const sym = query.trim().toUpperCase();
              if (sym !== value) onChange(sym);
            }}
            autoComplete="off"
          />
          {value ? (
            <button type="button" className="tools-widget-stock-clear" onClick={clear} aria-label="Clear symbol">×</button>
          ) : null}
        </div>
      </label>
      {open && debounced.trim().length >= 1 && (
        <ul className="tools-widget-autocomplete-menu" role="listbox">
          {loading && <li className="tools-widget-autocomplete-empty">Searching…</li>}
          {!loading && notFound && (
            <li className="tools-widget-autocomplete-empty">No matching tickers found.</li>
          )}
          {!loading && results.map((hit) => (
            <li key={hit.symbol}>
              <button type="button" role="option" onMouseDown={(e) => { e.preventDefault(); pick(hit); }}>
                <strong>{hit.symbol}</strong>
                <span>{hit.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StockSymbolFields({ slots, onChange }) {
  const updateSlot = (idx, sym) => {
    const next = [...slots];
    next[idx] = sym;
    onChange(next);
  };

  return (
    <div className="tools-widget-stock-grid">
      <StockSlotInput index={0} value={slots[0]} onChange={(s) => updateSlot(0, s)} label="Symbol 1" />
      <StockSlotInput index={1} value={slots[1]} onChange={(s) => updateSlot(1, s)} label="Symbol 2" />
      <StockSlotInput index={2} value={slots[2]} onChange={(s) => updateSlot(2, s)} label="Symbol 3" />
    </div>
  );
}
