import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { extractPageText } from '@/lib/tools/pdftools/pdf-operations';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   pageOrder: string[],
 *   pages: Array<{ key: string, fileId: string, pageIndex: number }>,
 *   fileMap: Record<string, { data: Uint8Array, name: string }>,
 *   onJumpToPage: (key: string) => void,
 * }} props
 */
export default function PdfTextSearch({
  open, onClose, pageOrder, pages, fileMap, onJumpToPage,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(/** @type {Array<{ key: string, pageNum: number, snippet: string }>} */([]));
  const [searching, setSearching] = useState(false);

  const pageMap = useMemo(
    () => Object.fromEntries(pages.map((p) => [p.key, p])),
    [pages],
  );

  const runSearch = useCallback(async (q) => {
    const term = q.trim().toLowerCase();
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const hits = [];
    for (let i = 0; i < pageOrder.length; i += 1) {
      const key = pageOrder[i];
      const page = pageMap[key];
      if (!page) continue;
      const file = fileMap[page.fileId];
      if (!file) continue;
      try {
        const text = await extractPageText(file.data, page.pageIndex, page.fileId);
        const idx = text.toLowerCase().indexOf(term);
        if (idx >= 0) {
          const start = Math.max(0, idx - 30);
          const snippet = (start > 0 ? '…' : '') + text.slice(start, idx + term.length + 40) + (idx + term.length + 40 < text.length ? '…' : '');
          hits.push({ key, pageNum: i + 1, snippet });
        }
      } catch {
        // skip unreadable pages
      }
    }
    setResults(hits);
    setSearching(false);
  }, [pageOrder, pageMap, fileMap]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(() => { void runSearch(query); }, 280);
    return () => clearTimeout(timer);
  }, [query, open, runSearch]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pdf-search-overlay" onClick={onClose} role="presentation">
      <div className="pdf-search-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Search in PDF">
        <header className="pdf-search-head">
          <Search size={16} />
          <input
            type="search"
            placeholder="Search text in document…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <button type="button" className="pdf-icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>
        <div className="pdf-search-results">
          {searching && <p className="pdf-muted">Searching…</p>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="pdf-muted">No matches found.</p>
          )}
          {!searching && query.trim().length < 2 && (
            <p className="pdf-muted">Type at least 2 characters to search.</p>
          )}
          <ul>
            {results.map((r) => (
              <li key={r.key}>
                <button
                  type="button"
                  onClick={() => {
                    onJumpToPage(r.key);
                    onClose();
                  }}
                >
                  <strong>Page {r.pageNum}</strong>
                  <span>{r.snippet}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
