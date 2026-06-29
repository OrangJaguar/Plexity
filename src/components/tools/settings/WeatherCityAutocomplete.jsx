import { useEffect, useRef, useState } from 'react';
import { searchWeatherCities, formatWeatherLocationLabel } from '@/lib/tools/weather-api';

function useDebouncedValue(value, ms = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export default function WeatherCityAutocomplete({ location, onSelect, onUnitChange, unit = 'fahrenheit' }) {
  const [query, setQuery] = useState(() => formatWeatherLocationLabel(location));
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const ref = useRef(null);
  const debounced = useDebouncedValue(query);

  useEffect(() => {
    setQuery(formatWeatherLocationLabel(location));
  }, [location]);

  useEffect(() => {
    if (!open || debounced.trim().length < 2) {
      setResults([]);
      setNotFound(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    searchWeatherCities(debounced)
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
    onSelect(hit);
    setQuery(hit.label);
    setOpen(false);
    setNotFound(false);
  };

  return (
    <div className="tools-widget-autocomplete" ref={ref}>
      <label className="tools-widget-inline-field">
        City
        <input
          className="tools-settings-input"
          type="text"
          placeholder="Start typing a city…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setNotFound(false);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
      </label>
      {open && debounced.trim().length >= 2 && (
        <ul className="tools-widget-autocomplete-menu" role="listbox">
          {loading && <li className="tools-widget-autocomplete-empty">Searching…</li>}
          {!loading && notFound && (
            <li className="tools-widget-autocomplete-empty">We couldn&apos;t find this city. Try another spelling.</li>
          )}
          {!loading && results.map((hit) => (
            <li key={`${hit.latitude}-${hit.longitude}`}>
              <button type="button" role="option" onMouseDown={(e) => { e.preventDefault(); pick(hit); }}>
                {hit.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="tools-widget-unit-row">
        <span className="tools-settings-label">Temperature</span>
        <div className="tools-widget-unit-toggle" role="group" aria-label="Temperature unit">
          <button
            type="button"
            className={`tools-widget-unit-btn${unit === 'fahrenheit' ? ' active' : ''}`}
            onClick={() => onUnitChange?.('fahrenheit')}
          >
            °F
          </button>
          <button
            type="button"
            className={`tools-widget-unit-btn${unit === 'celsius' ? ' active' : ''}`}
            onClick={() => onUnitChange?.('celsius')}
          >
            °C
          </button>
        </div>
      </div>
    </div>
  );
}
