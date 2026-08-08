export default function BrawlPreview() {
  return (
    <div className="tools-preview-scale tools-preview-brawl">
      <div className="tools-brawl-shell tools-preview-brawl-shell">
        <header className="tools-brawl-header">
          <div className="tools-brawl-header-left">
            <div className="tools-brawl-slider tools-brawl-slider--accent" data-active-index="0" style={{ '--brawl-slider-count': '2' }} aria-hidden>
              <div className="tools-brawl-slider-track">
                <div className="tools-brawl-slider-thumb" style={{ transform: 'translateX(0%)' }} />
                <button type="button" className="is-active" tabIndex={-1}><span>Solo</span></button>
                <button type="button" tabIndex={-1}><span>Trio</span></button>
              </div>
            </div>
          </div>
          <div className="tools-brawl-header-right">
            <div className="tools-brawl-slider tools-brawl-slider--chrome" data-active-index="0" style={{ '--brawl-slider-count': '2' }} aria-hidden>
              <div className="tools-brawl-slider-track">
                <div className="tools-brawl-slider-thumb" style={{ transform: 'translateX(0%)' }} />
                <button type="button" className="is-active" tabIndex={-1}><span>Ranked</span></button>
                <button type="button" tabIndex={-1}><span>Team</span></button>
              </div>
            </div>
          </div>
        </header>
        <main className="tools-brawl-main">
          <div className="tools-brawl-empty tools-brawl-empty--preview">
            <p className="tools-brawl-empty-kicker">Mythic+</p>
            <h2>Solo draft</h2>
            <p>Ban · pick · assign</p>
          </div>
        </main>
      </div>
    </div>
  );
}
