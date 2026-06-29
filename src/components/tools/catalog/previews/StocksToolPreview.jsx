import { StocksKpi } from '@/components/tools/stocks/stocks-shared';

const NAV = ['Overview', 'Screener', 'Watchlist', 'Research', 'Earnings'];

export default function StocksToolPreview() {
  return (
    <div className="tools-preview-scale tools-preview-stocks">
      <div className="stocks-workspace tools-preview-stocks-workspace">
        <aside className="stocks-workspace-nav">
          <div className="stocks-workspace-brand">
            <span className="stocks-workspace-title">Updated 12s ago</span>
          </div>
          <nav className="stocks-nav">
            {NAV.map((label) => (
              <span
                key={label}
                className={`stocks-nav-item${label === 'Overview' ? ' is-active' : ''}`}
              >
                {label}
              </span>
            ))}
          </nav>
        </aside>
        <div className="stocks-workspace-main">
          <div className="stocks-workspace-search-row tools-preview-stocks-search">
            <div className="stocks-search">
              <span>Search ticker or company…</span>
            </div>
          </div>
          <div className="stocks-page stocks-overview">
            <header className="stocks-page-head">
              <h1>Overview</h1>
              <p className="stocks-data-notice">For research use · Data may be delayed</p>
            </header>
            <div className="stocks-index-row">
              <StocksKpi label="S&P 500" value="5,432.18" sub="+0.42%" trend={0.42} />
              <StocksKpi label="Nasdaq" value="17,245.30" sub="-0.18%" trend={-0.18} />
              <StocksKpi label="Dow" value="39,118.50" sub="+0.11%" trend={0.11} />
            </div>
            <div className="stocks-overview-grid tools-preview-stocks-grid">
              <div className="stocks-panel">
                <div className="stocks-panel-head"><strong>Watchlist</strong></div>
                <ul className="stocks-compact-list">
                  <li>
                    <div className="stocks-compact-row">
                      <span><strong>ADBE</strong><span className="stocks-muted stocks-compact-name">Adobe Inc.</span></span>
                      <span className="stocks-compact-right"><strong>$193.41</strong><span className="stocks-change stocks-change--down">-1.60%</span></span>
                    </div>
                  </li>
                  <li>
                    <div className="stocks-compact-row">
                      <span><strong>NVDA</strong><span className="stocks-muted stocks-compact-name">NVIDIA Corp.</span></span>
                      <span className="stocks-compact-right"><strong>$128.44</strong><span className="stocks-change stocks-change--up">+2.14%</span></span>
                    </div>
                  </li>
                </ul>
              </div>
              <div className="stocks-panel">
                <div className="stocks-panel-head"><strong>Top gainers</strong></div>
                <ul className="stocks-compact-list">
                  <li>
                    <div className="stocks-compact-row">
                      <span><strong>SMCI</strong></span>
                      <span className="stocks-change stocks-change--up">+8.2%</span>
                    </div>
                  </li>
                  <li>
                    <div className="stocks-compact-row">
                      <span><strong>ARM</strong></span>
                      <span className="stocks-change stocks-change--up">+5.1%</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
