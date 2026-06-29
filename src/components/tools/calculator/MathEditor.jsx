import { useCallback, useEffect, useRef, useState } from 'react';
import { getAutocompleteSuggestions } from '@/lib/tools/calculator/parser/shorthand';
import { humanizeError } from '@/lib/tools/calculator/error-messages';

const ERROR_DEBOUNCE_MS = 1000;

export default function MathEditor({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  error,
  definedSymbols = [],
  autoFocus = false,
  rowIndex,
}) {
  const inputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedError, setDebouncedError] = useState('');
  const errorTimer = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
    if (!value.trim()) {
      setDebouncedError('');
      return undefined;
    }
    errorTimer.current = window.setTimeout(() => {
      setDebouncedError(error ? humanizeError(error) : '');
    }, ERROR_DEBOUNCE_MS);
    return () => {
      if (errorTimer.current) clearTimeout(errorTimer.current);
    };
  }, [value, error]);

  const updateSuggestions = useCallback((text, cursorPos) => {
    const before = text.slice(0, cursorPos);
    const match = before.match(/[a-zA-Zπ_][a-zA-Z0-9π_]*$/);
    if (!match) {
      setShowSuggestions(false);
      return;
    }
    const items = getAutocompleteSuggestions(match[0], definedSymbols);
    setSuggestions(items);
    setActiveIdx(0);
    setShowSuggestions(items.length > 0);
  }, [definedSymbols]);

  const handleChange = (e) => {
    const next = e.target.value;
    onChange(next);
    updateSuggestions(next, e.target.selectionStart || next.length);
  };

  const applySuggestion = (item) => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart || value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const match = before.match(/[a-zA-Zπ_][a-zA-Z0-9π_]*$/);
    const prefix = match ? before.slice(0, -match[0].length) : before;
    const next = `${prefix}${item.value}${after}`;
    onChange(next);
    setShowSuggestions(false);
    requestAnimationFrame(() => el.focus());
  };

  const handleKeyDown = (e) => {
    if (showSuggestions && suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && showSuggestions)) {
        e.preventDefault();
        applySuggestion(suggestions[activeIdx]);
        return;
      }
      if (e.key === 'Escape') { setShowSuggestions(false); return; }
    }
    if (e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className={`calc-math-editor ${debouncedError ? 'has-error' : ''}`}>
      {rowIndex != null ? <span className="calc-expr-index">{rowIndex}</span> : null}
      <input
        ref={inputRef}
        type="text"
        className="calc-math-editor-input"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        aria-invalid={Boolean(debouncedError)}
      />
      {debouncedError ? <div className="calc-math-editor-error">{debouncedError}</div> : null}
      {showSuggestions ? (
        <ul className="calc-autocomplete" role="listbox">
          {suggestions.map((item, i) => (
            <li key={item.label}>
              <button
                type="button"
                className={i === activeIdx ? 'is-active' : ''}
                onMouseDown={(e) => { e.preventDefault(); applySuggestion(item); }}
              >
                <span>{item.label}</span>
                <span className="calc-autocomplete-kind">{item.kind}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
