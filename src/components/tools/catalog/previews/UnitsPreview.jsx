import { ArrowLeftRight, Pin } from 'lucide-react';

const CATEGORIES = ['Length', 'Weight', 'Volume', 'Temperature'];

export default function UnitsPreview() {
  return (
    <div className="tools-preview-scale tools-preview-units">
      <div className="tools-units-layout tools-preview-units-layout">
        <main className="tools-units-main">
          <div className="tools-units-tabs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                className={cat === 'Length' ? 'active' : ''}
                tabIndex={-1}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="tools-units-box-wrap--main">
            <div className="tools-units-box tools-units-box--main">
              <div className="tools-units-converter">
                <label className="tools-settings-label">
                  Amount
                  <input className="tools-settings-input" defaultValue="5" readOnly tabIndex={-1} />
                </label>
                <label className="tools-settings-label">
                  From
                  <select className="tools-settings-input" defaultValue="mi" tabIndex={-1}>
                    <option value="mi">Miles (mi)</option>
                  </select>
                </label>
                <button type="button" className="tools-units-swap" tabIndex={-1} aria-hidden>
                  <ArrowLeftRight size={16} />
                </button>
                <label className="tools-settings-label">
                  To
                  <select className="tools-settings-input" defaultValue="km" tabIndex={-1}>
                    <option value="km">Kilometers (km)</option>
                  </select>
                </label>
              </div>
              <button type="button" className="tools-units-copyable tools-units-result" tabIndex={-1}>
                8.04672
              </button>
            </div>
          </div>
        </main>
        <aside className="tools-units-sidebar">
          <button type="button" className="tools-units-sidebar-btn" tabIndex={-1}>
            <Pin size={14} /> Pin pair
          </button>
          <div className="tools-units-sidebar-section">
            <h3>Pinned</h3>
            <button type="button" className="tools-units-sidebar-item" tabIndex={-1}>5 mi → km</button>
            <button type="button" className="tools-units-sidebar-item" tabIndex={-1}>68 °F → °C</button>
          </div>
          <div className="tools-units-sidebar-section">
            <h3>History</h3>
            <button type="button" className="tools-units-sidebar-item" tabIndex={-1}>12 lb → kg</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
