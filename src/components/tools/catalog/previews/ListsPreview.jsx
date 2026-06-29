export default function ListsPreview() {
  return (
    <div className="tools-preview-scale tools-preview-lists">
      <div className="tools-lists-preview-layout">
        <aside className="tools-lists-preview-sidebar">
          <div className="tools-lists-preview-head">
            <strong>My lists</strong>
            <span className="tools-preview-pill">+ New</span>
          </div>
          <button type="button" className="tools-lists-preview-item is-active" tabIndex={-1}>
            <span>College visits</span>
            <span className="tools-lists-preview-count">8</span>
          </button>
          <button type="button" className="tools-lists-preview-item" tabIndex={-1}>
            <span>Summer reading</span>
            <span className="tools-lists-preview-count">12</span>
          </button>
          <button type="button" className="tools-lists-preview-item" tabIndex={-1}>
            <span>Scholarships</span>
            <span className="tools-lists-preview-count">5</span>
          </button>
        </aside>
        <section className="tools-lists-preview-main">
          <header className="tools-lists-preview-main-head">
            <div>
              <h3>College visits</h3>
              <p>Track schools, visit dates, and follow-up notes</p>
            </div>
            <span className="tools-preview-soon-badge">Coming soon</span>
          </header>
          <div className="tools-lists-preview-table-wrap">
            <table className="tools-lists-preview-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Visit date</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Stanford</td>
                  <td>Aug 12</td>
                  <td><span className="tools-lists-preview-status">Scheduled</span></td>
                  <td>Meet engineering dept</td>
                </tr>
                <tr>
                  <td>UC Berkeley</td>
                  <td>Sep 3</td>
                  <td><span className="tools-lists-preview-status">Planned</span></td>
                  <td>Campus tour booked</td>
                </tr>
                <tr>
                  <td>UCLA</td>
                  <td>—</td>
                  <td><span className="tools-lists-preview-status muted">Not yet</span></td>
                  <td>Waiting on dates</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
