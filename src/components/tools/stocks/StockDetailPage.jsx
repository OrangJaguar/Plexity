import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, BookmarkCheck, Bell, ExternalLink, Scale } from 'lucide-react';
import { CHART_RANGES, STOCK_TABS, newPriceAlert, newWatchlistItem, normalizeResearchNote, trackRecentStock } from '@/lib/tools/stocks/stocks-model';
import {
  formatChange, formatDate, formatLargeNumber, formatMarketCap,
  formatPercent, formatPrice, formatVolume,
} from '@/lib/tools/stocks/stocks-format';
import { secEdgarUrl, yahooProfileUrl } from '@/lib/tools/stocks/stocks-provider';
import { useStockChart, useStockNews, useStockSummary } from '@/hooks/queries/useStocksMarket';
import StocksChart from '@/components/tools/stocks/StocksChart';
import StocksFiftyTwoWeekBar from '@/components/tools/stocks/StocksFiftyTwoWeekBar';
import StocksAnalystConsensus from '@/components/tools/stocks/StocksAnalystConsensus';
import {
  StocksChange, StocksDataNotice, StocksError, StocksLoader, StocksPanel,
} from '@/components/tools/stocks/stocks-shared';
import { stocksRoute, stocksSymbolRoute } from '@/lib/tools/tool-routes';

export default function StockDetailPage({ symbol, workspace, saveWorkspace, compare }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  const [chartRange, setChartRange] = useState('1d');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertAbove, setAlertAbove] = useState('');
  const [alertBelow, setAlertBelow] = useState('');

  const summary = useStockSummary(symbol);
  const rangeConfig = CHART_RANGES.find((r) => r.id === chartRange) || CHART_RANGES[0];
  const chart = useStockChart(symbol, rangeConfig.range, rangeConfig.interval);
  const news = useStockNews(symbol);

  const sym = symbol?.toUpperCase();
  const onWatchlist = (workspace?.watchlist || []).some((w) => w.symbol === sym);
  const research = normalizeResearchNote(workspace?.research?.[sym]);

  useEffect(() => {
    if (summary.data?.symbol) {
      trackRecentStock(summary.data.symbol, summary.data.name);
    }
  }, [summary.data?.symbol, summary.data?.name]);

  const setTab = (id) => setSearchParams({ tab: id }, { replace: true });

  const toggleWatch = () => {
    if (onWatchlist) {
      saveWorkspace({ watchlist: workspace.watchlist.filter((w) => w.symbol !== sym) });
    } else {
      const item = newWatchlistItem(sym, summary.data?.name || '');
      saveWorkspace({ watchlist: [...(workspace.watchlist || []), item] });
    }
  };

  const updateResearch = useCallback((patch) => {
    const next = normalizeResearchNote({ ...research, ...patch, updatedAt: Date.now() });
    saveWorkspace({ research: { ...workspace.research, [sym]: next } });
  }, [research, saveWorkspace, sym, workspace.research]);

  const saveAlert = () => {
    const above = alertAbove ? Number(alertAbove) : null;
    const below = alertBelow ? Number(alertBelow) : null;
    if (above == null && below == null) return;
    const alert = newPriceAlert(sym, { above, below });
    saveWorkspace({ priceAlerts: [...(workspace.priceAlerts || []), alert] });
    setAlertOpen(false);
    setAlertAbove('');
    setAlertBelow('');
  };

  if (summary.isLoading) return <StocksLoader />;
  if (summary.isError || !summary.data) {
    return (
      <div className="stocks-page">
        <StocksError message={`Could not load ${sym}.`} onRetry={() => summary.refetch()} />
        <Link to={stocksRoute()} className="stocks-btn stocks-btn--ghost">← Back</Link>
      </div>
    );
  }

  const d = summary.data;
  const s = d.stats || {};
  const p = d.profile || {};

  return (
    <div className="stocks-page stocks-detail">
      <div className="stocks-detail-top">
        <header className="stocks-detail-hero">
          <button type="button" className="stocks-btn stocks-btn--ghost stocks-detail-back" onClick={() => navigate(stocksRoute())}>
            <ArrowLeft size={16} aria-hidden />
            <span className="stocks-detail-back-label">Back</span>
          </button>
          <div className="stocks-detail-identity">
            <h1>{d.name}</h1>
            <p className="stocks-detail-meta">
              <span>{sym}{d.exchange && ` · ${d.exchange}`}</span>
              {(p.sector || p.industry) && (
                <span className="stocks-detail-meta-secondary">{[p.sector, p.industry].filter(Boolean).join(' · ')}</span>
              )}
            </p>
          </div>
          <div className="stocks-detail-quote">
            <div className="stocks-detail-price">
              <strong>{formatPrice(d.price)}</strong>
              <StocksChange value={d.change} amount={d.changeAmount} />
            </div>
            {d.postMarketPrice != null && (
              <div className="stocks-detail-extended">
                <span>After-hours {formatPrice(d.postMarketPrice)}</span>
                {d.postMarketChange != null && <StocksChange value={d.postMarketChange} className="stocks-change--sm" />}
              </div>
            )}
            {d.preMarketPrice != null && d.marketState === 'PRE' && (
              <div className="stocks-detail-extended">
                <span>Pre-market {formatPrice(d.preMarketPrice)}</span>
                {d.preMarketChange != null && <StocksChange value={d.preMarketChange} className="stocks-change--sm" />}
              </div>
            )}
          </div>
          <div className="stocks-detail-actions">
            <button type="button" className={`stocks-btn stocks-btn--sm${onWatchlist ? ' stocks-btn--primary' : ''}`} onClick={toggleWatch}>
              {onWatchlist ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {onWatchlist ? 'Watching' : 'Watchlist'}
            </button>
            <button
              type="button"
              className={`stocks-btn stocks-btn--ghost stocks-btn--sm${compare?.isSelected(sym) ? ' stocks-btn--primary' : ''}`}
              disabled={!compare?.isSelected(sym) && !compare?.canAdd}
              onClick={() => compare?.toggle(sym)}
            >
              <Scale size={16} /> Compare
            </button>
            <button type="button" className="stocks-btn stocks-btn--ghost stocks-btn--sm" onClick={() => setAlertOpen((o) => !o)}>
              <Bell size={16} /> Alert
            </button>
          </div>
        </header>

        <nav className="stocks-tabs" aria-label="Stock sections">
          {STOCK_TABS.map((t) => (
            <button key={t.id} type="button" className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <StocksDataNotice updatedAt={d.updatedAt} className="stocks-data-notice--detail" />
      </div>

      {alertOpen && (
        <div className="stocks-alert-form">
          <label>Alert above <input type="number" step="0.01" placeholder="Price" value={alertAbove} onChange={(e) => setAlertAbove(e.target.value)} /></label>
          <label>Alert below <input type="number" step="0.01" placeholder="Price" value={alertBelow} onChange={(e) => setAlertBelow(e.target.value)} /></label>
          <button type="button" className="stocks-btn stocks-btn--primary stocks-btn--sm" onClick={saveAlert}>Save alert</button>
        </div>
      )}

      {tab === 'overview' && (
        <div className="stocks-detail-overview-v2">
          <div className="stocks-detail-chart-full">
            <div className="stocks-chart-ranges">
              {CHART_RANGES.map((r) => (
                <button key={r.id} type="button" className={chartRange === r.id ? 'is-active' : ''} onClick={() => setChartRange(r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
            {chart.isLoading ? <StocksLoader /> : (
              <StocksChart
                points={chart.data?.points}
                referencePrice={chart.data?.meta?.prevClose ?? chart.data?.meta?.dayOpen}
                isUp={chart.data?.meta?.isUp}
                sessions={chart.data?.sessions}
                intraday={chart.data?.intraday}
                height={chartRange === '1d' ? 360 : 320}
              />
            )}
          </div>
          <div className="stocks-detail-below-chart">
            <div className="stocks-detail-below-left">
              <StocksPanel title="Company">
                <div className="stocks-panel-pad">
                  {p.description ? (
                    <p className="stocks-desc">{p.description.slice(0, 500)}{p.description.length > 500 ? '…' : ''}</p>
                  ) : (
                    <p className="stocks-desc stocks-desc--fallback">
                      {p.sector || p.industry
                        ? `${d.name} operates in ${[p.sector, p.industry].filter(Boolean).join(' · ')}.`
                        : `Profile data for ${sym}.`}
                    </p>
                  )}
                  <dl className="stocks-stat-grid stocks-stat-grid--company">
                    {p.ceo && <div><dt>CEO</dt><dd>{p.ceo}</dd></div>}
                    {p.employees && <div><dt>Employees</dt><dd>{p.employees.toLocaleString()}</dd></div>}
                    {p.country && <div><dt>HQ</dt><dd>{[p.city, p.state, p.country].filter(Boolean).join(', ')}</dd></div>}
                    {p.sector && <div><dt>Sector</dt><dd>{p.sector}</dd></div>}
                    {p.industry && <div><dt>Industry</dt><dd>{p.industry}</dd></div>}
                  </dl>
                  <div className="stocks-company-links">
                    {p.website && (
                      <a href={p.website} target="_blank" rel="noopener noreferrer">
                        Website <ExternalLink size={12} />
                      </a>
                    )}
                    <a href={secEdgarUrl(sym, d.name)} target="_blank" rel="noopener noreferrer">
                      SEC filings <ExternalLink size={12} />
                    </a>
                    <a href={yahooProfileUrl(sym)} target="_blank" rel="noopener noreferrer">
                      Full profile <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </StocksPanel>
              {d.consensus?.total > 0 && (
                <StocksPanel title="Analyst consensus">
                  <div className="stocks-panel-pad">
                    <StocksAnalystConsensus consensus={d.consensus} currentPrice={d.price} />
                  </div>
                </StocksPanel>
              )}
            </div>
            <div className="stocks-detail-below-right">
              <StocksPanel title="Key statistics" className="stocks-panel--stats">
                <div className="stocks-panel-pad">
                  <StocksFiftyTwoWeekBar price={d.price} low={s.fiftyTwoWeekLow} high={s.fiftyTwoWeekHigh} className="stocks-52wk--detail" />
                  <dl className="stocks-stat-grid">
                    <div><dt>Open</dt><dd>{formatPrice(s.open)}</dd></div>
                    <div><dt>Prev close</dt><dd>{formatPrice(s.previousClose)}</dd></div>
                    <div><dt>Day range</dt><dd>{formatPrice(s.dayLow)} – {formatPrice(s.dayHigh)}</dd></div>
                    <div><dt>Market cap</dt><dd>{formatMarketCap(s.marketCap)}</dd></div>
                    <div><dt>P/E</dt><dd>{s.pe != null ? s.pe.toFixed(2) : '—'}</dd></div>
                    <div><dt>EPS</dt><dd>{s.eps != null ? `$${s.eps.toFixed(2)}` : '—'}</dd></div>
                    <div><dt>Div yield</dt><dd>{s.dividendYield != null ? formatPercent(s.dividendYield) : '—'}</dd></div>
                    <div><dt>52-wk range</dt><dd>{formatPrice(s.fiftyTwoWeekLow)} – {formatPrice(s.fiftyTwoWeekHigh)}</dd></div>
                    <div><dt>Avg volume</dt><dd>{formatVolume(s.avgVolume)}</dd></div>
                    <div><dt>Volume</dt><dd>{formatVolume(s.volume)}</dd></div>
                    <div><dt>Beta</dt><dd>{s.beta != null ? s.beta.toFixed(2) : '—'}</dd></div>
                    <div><dt>Rev growth</dt><dd>{s.revenueGrowth != null ? formatPercent(s.revenueGrowth) : '—'}</dd></div>
                    <div><dt>Profit margin</dt><dd>{s.profitMargins != null ? formatPercent(s.profitMargins) : '—'}</dd></div>
                    <div><dt>50-day avg</dt><dd>{formatPrice(s.fiftyDayAverage)}</dd></div>
                    <div><dt>200-day avg</dt><dd>{formatPrice(s.twoHundredDayAverage)}</dd></div>
                  </dl>
                </div>
              </StocksPanel>
            </div>
          </div>
        </div>
      )}

      {tab === 'financials' && (
        <FinancialsTab financials={d.financials} stats={s} />
      )}

      {tab === 'earnings' && (
        <EarningsTab earnings={d.earnings} symbol={sym} />
      )}

      {tab === 'news' && (
        <div className="stocks-detail-news">
          {news.isLoading ? <StocksLoader /> : (
            <ul className="stocks-news-list stocks-news-list--detail">
              {(news.data || []).map((n, i) => (
                <li key={i}>
                  <a href={n.link} target="_blank" rel="noopener noreferrer">{n.title}</a>
                  <span className="stocks-news-meta">{n.publisher} · {formatDate(n.publishedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'analysis' && (
        <AnalysisTab research={research} onUpdate={updateResearch} symbol={sym} />
      )}
    </div>
  );
}

function FinancialsTab({ financials, stats }) {
  const [period, setPeriod] = useState('annual');
  const income = period === 'annual' ? financials?.annual : financials?.quarterly;

  return (
    <div className="stocks-financials">
      <div className="stocks-period-toggle stocks-period-toggle--spaced">
        <button type="button" className={period === 'annual' ? 'is-active' : ''} onClick={() => setPeriod('annual')}>Annual</button>
        <button type="button" className={period === 'quarterly' ? 'is-active' : ''} onClick={() => setPeriod('quarterly')}>Quarterly</button>
      </div>
      {(!income || income.length === 0) && (
        <p className="stocks-muted stocks-panel-pad">Financial statement data is not available for this symbol.</p>
      )}
      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Period</th>
              <th className="stocks-table-num">Revenue</th>
              <th className="stocks-table-num">Gross profit</th>
              <th className="stocks-table-num">Operating income</th>
              <th className="stocks-table-num">Net income</th>
            </tr>
          </thead>
          <tbody>
            {(income || []).slice(-8).map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td className="stocks-table-num">{formatLargeNumber(row.revenue)}</td>
                <td className="stocks-table-num">{formatLargeNumber(row.grossProfit)}</td>
                <td className="stocks-table-num">{formatLargeNumber(row.operatingIncome)}</td>
                <td className="stocks-table-num">{formatLargeNumber(row.netIncome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="stocks-stat-grid stocks-stat-grid--wide">
        <div><dt>Total cash</dt><dd>{formatLargeNumber(stats.totalCash)}</dd></div>
        <div><dt>Total debt</dt><dd>{formatLargeNumber(stats.totalDebt)}</dd></div>
        <div><dt>Free cash flow</dt><dd>{formatLargeNumber(stats.freeCashflow)}</dd></div>
        <div><dt>Operating cash flow</dt><dd>{formatLargeNumber(stats.operatingCashflow)}</dd></div>
        <div><dt>Gross margin</dt><dd>{stats.grossMargins != null ? formatPercent(stats.grossMargins) : '—'}</dd></div>
        <div><dt>Operating margin</dt><dd>{stats.operatingMargins != null ? formatPercent(stats.operatingMargins) : '—'}</dd></div>
      </dl>
    </div>
  );
}

function EarningsTab({ earnings, symbol }) {
  return (
    <div className="stocks-earnings-tab">
      {earnings?.nextDate && (
        <div className="stocks-earnings-next">
          <h3>Next earnings</h3>
          <p>{formatDate(earnings.nextDate)}</p>
          {earnings.epsAvg != null && <p className="stocks-muted">EPS estimate: ${earnings.epsAvg.toFixed(2)}</p>}
        </div>
      )}
      <div className="stocks-table-wrap">
        <table className="stocks-table">
          <thead>
            <tr>
              <th>Quarter</th>
              <th className="stocks-table-num">EPS actual</th>
              <th className="stocks-table-num">EPS est.</th>
              <th className="stocks-table-num">Surprise</th>
            </tr>
          </thead>
          <tbody>
            {(earnings?.history || []).slice(0, 8).map((h, i) => (
              <tr key={i}>
                <td>{h.quarter}</td>
                <td className="stocks-table-num">{h.epsActual?.toFixed(2) ?? '—'}</td>
                <td className="stocks-table-num">{h.epsEstimate?.toFixed(2) ?? '—'}</td>
                <td className="stocks-table-num">
                  {h.surprisePct != null ? `${h.surprisePct > 0 ? '+' : ''}${h.surprisePct.toFixed(1)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ANALYSIS_FIELDS = [
  { key: 'thesis', label: 'Investment thesis' },
  { key: 'bullCase', label: 'Bull case' },
  { key: 'bearCase', label: 'Bear case' },
  { key: 'risks', label: 'Key risks' },
  { key: 'catalysts', label: 'Catalysts' },
  { key: 'valuation', label: 'Valuation notes' },
  { key: 'buyConditions', label: 'What would make me buy' },
  { key: 'sellConditions', label: 'What would make me sell / avoid' },
  { key: 'management', label: 'Management & business quality' },
  { key: 'competitors', label: 'Competitors' },
];

function AnalysisTab({ research, onUpdate, symbol }) {
  return (
    <div className="stocks-analysis">
      <div className="stocks-analysis-sentiment">
        <label>
          Rating
          <select value={research.sentiment} onChange={(e) => onUpdate({ sentiment: e.target.value })}>
            <option value="bullish">Bullish</option>
            <option value="neutral">Neutral</option>
            <option value="bearish">Bearish</option>
          </select>
        </label>
      </div>
      {ANALYSIS_FIELDS.map(({ key, label }) => (
        <label key={key} className="stocks-analysis-field">
          <span>{label}</span>
          <textarea
            rows={3}
            value={research[key] || ''}
            onChange={(e) => onUpdate({ [key]: e.target.value })}
            placeholder={`${label} for ${symbol}…`}
          />
        </label>
      ))}
      <p className="stocks-muted stocks-analysis-save">Notes save automatically.</p>
    </div>
  );
}
