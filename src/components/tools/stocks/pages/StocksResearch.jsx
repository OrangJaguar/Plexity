import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RESEARCH_TAGS } from '@/lib/tools/stocks/stocks-model';
import { formatDateTime } from '@/lib/tools/stocks/stocks-format';
import { StocksDataNotice } from '@/components/tools/stocks/stocks-shared';
import { stocksSymbolRoute } from '@/lib/tools/tool-routes';

export default function StocksResearch({ workspace, saveWorkspace }) {
  const navigate = useNavigate();
  const research = workspace?.research || {};
  const [selected, setSelected] = useState(null);
  const [tagFilter, setTagFilter] = useState('all');

  const entries = useMemo(() => {
    const keys = Object.keys(research);
    const fromWatch = (workspace?.watchlist || []).map((w) => w.symbol);
    const all = [...new Set([...keys, ...fromWatch])];
    return all.map((symbol) => {
      const note = research[symbol];
      const watch = workspace?.watchlist?.find((w) => w.symbol === symbol);
      return {
        symbol,
        name: watch?.name || symbol,
        note,
        updatedAt: note?.updatedAt || 0,
        hasContent: Boolean(note?.thesis || note?.bullCase || note?.bearCase),
      };
    }).filter((e) => e.hasContent || fromWatch.includes(e.symbol))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [research, workspace]);

  const filtered = tagFilter === 'all'
    ? entries
    : entries.filter((e) => e.note?.tags?.includes(tagFilter));

  const active = selected
    ? filtered.find((e) => e.symbol === selected) || entries.find((e) => e.symbol === selected)
    : filtered[0];

  return (
    <div className="stocks-page stocks-research-page">
      <header className="stocks-page-head">
        <h1>Research</h1>
        <StocksDataNotice />
      </header>

      <div className="stocks-research-layout">
        <aside className="stocks-research-list">
          <div className="stocks-tag-filters">
            <button type="button" className={tagFilter === 'all' ? 'is-active' : ''} onClick={() => setTagFilter('all')}>All</button>
            {RESEARCH_TAGS.slice(0, 6).map((t) => (
              <button key={t} type="button" className={tagFilter === t ? 'is-active' : ''} onClick={() => setTagFilter(t)}>{t}</button>
            ))}
          </div>
          <ul>
            {filtered.map((e) => (
              <li key={e.symbol}>
                <button
                  type="button"
                  className={active?.symbol === e.symbol ? 'is-active' : ''}
                  onClick={() => setSelected(e.symbol)}
                >
                  <strong>{e.symbol}</strong>
                  <span>{e.note?.thesis?.slice(0, 50) || 'No thesis yet'}</span>
                  {e.note?.updatedAt && <em>{formatDateTime(e.note.updatedAt / 1000)}</em>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="stocks-research-preview">
          {active ? (
            <>
              <header>
                <h2>{active.symbol}</h2>
                <button type="button" className="stocks-btn stocks-btn--primary stocks-btn--sm" onClick={() => navigate(stocksSymbolRoute(active.symbol, { tab: 'analysis' }))}>
                  Open full analysis
                </button>
              </header>
              {active.note?.thesis && <section><h4>Thesis</h4><p>{active.note.thesis}</p></section>}
              {active.note?.bullCase && <section><h4>Bull case</h4><p>{active.note.bullCase}</p></section>}
              {active.note?.bearCase && <section><h4>Bear case</h4><p>{active.note.bearCase}</p></section>}
              {!active.note?.thesis && !active.note?.bullCase && (
                <p className="stocks-muted">No research saved yet. Open the stock page and use the Analysis tab.</p>
              )}
            </>
          ) : (
            <p className="stocks-muted">Add stocks to your watchlist and write notes on their Analysis tab.</p>
          )}
        </main>
      </div>
    </div>
  );
}
