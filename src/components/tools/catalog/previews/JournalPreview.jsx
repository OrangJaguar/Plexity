import { JOURNAL_MOODS } from '@/lib/tools/journal-text';
import JournalMoodIcon from '@/components/tools/journal/JournalMoodIcon';

export default function JournalPreview() {
  return (
    <div className="tools-preview-scale tools-preview-journal">
      <div className="tools-journal-shell tools-preview-journal-shell">
        <section className="tools-journal-main">
          <div className="tools-journal-main-head">
            <h3>Tuesday, June 23</h3>
            <div className="tools-journal-head-actions">
              <div className="tools-journal-mood-row">
                {JOURNAL_MOODS.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`tools-journal-mood-chip${i === 1 ? ' active' : ''}`}
                    tabIndex={-1}
                    aria-label={m.label}
                  >
                    <JournalMoodIcon mood={m.id} size={18} />
                  </button>
                ))}
              </div>
              <div className="tools-journal-toolbar">
                <button type="button" className="tools-journal-tool-btn" tabIndex={-1}>B</button>
                <button type="button" className="tools-journal-tool-btn" tabIndex={-1}>I</button>
                <button type="button" className="tools-journal-tool-btn" tabIndex={-1}>U</button>
              </div>
              <span className="tools-journal-streak-pill">5-day streak</span>
            </div>
          </div>
          <p className="tools-journal-daily-prompt">What felt like progress today?</p>
          <div
            className="tools-journal-text tools-preview-journal-editor"
            data-placeholder="Quick reflection. What's on your mind today?"
          />
          <div className="tools-journal-meta-row">
            <span className="tools-journal-word-count">0 words</span>
          </div>
        </section>
        <aside className="tools-journal-storage tools-preview-journal-storage">
          <div className="tools-journal-storage-head">
            <input
              className="tools-journal-search"
              placeholder="Search past entries"
              readOnly
              tabIndex={-1}
            />
            <button type="button" className="tools-journal-month-btn" tabIndex={-1}>Month</button>
            <button type="button" className="tools-journal-storage-toggle" tabIndex={-1} aria-hidden>▴</button>
          </div>
          <div className="tools-journal-list">
            <button type="button" className="tools-journal-entry-btn" tabIndex={-1}>
              <span className="tools-journal-entry-date">Mon, Jun 22</span>
              <span className="tools-journal-entry-preview">Finished the chem lab write-up…</span>
            </button>
            <button type="button" className="tools-journal-entry-btn" tabIndex={-1}>
              <span className="tools-journal-entry-date">Sun, Jun 21</span>
              <span className="tools-journal-entry-preview">Long study session for the history…</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
