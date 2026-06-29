const DAYS = [
  { label: 'Mon', num: 23 },
  { label: 'Tue', num: 24 },
  { label: 'Wed', num: 25, today: true },
  { label: 'Thu', num: 26 },
  { label: 'Fri', num: 27 },
];

const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM'];

const EVENTS = [
  { day: 2, top: 18, height: 42, title: 'AP Chem', color: '#6366f1', time: '8:00 – 8:52' },
  { day: 2, top: 74, height: 36, title: 'Study group', color: '#22c55e', time: '10:15 – 11:00' },
  { day: 3, top: 36, height: 48, title: 'English essay', color: '#f59e0b', time: '9:00 – 10:00' },
];

export default function CalendarPreview() {
  return (
    <div className="tools-preview-scale tools-preview-calendar">
      <div className="tools-calendar-shell tools-preview-calendar-shell">
        <header className="tools-calendar-head">
          <button type="button" className="tools-calendar-nav-btn" tabIndex={-1}>‹</button>
          <button type="button" className="tools-calendar-nav-btn" tabIndex={-1}>›</button>
          <button type="button" className="btn btn-primary tools-preview-calendar-today" tabIndex={-1}>Today</button>
          <span className="tools-calendar-range-label">Jun 23 – Jun 27</span>
          <button type="button" className="btn" tabIndex={-1}>Month View</button>
        </header>
        <div className="tools-calendar-week-grid-wrap">
          <div className="tools-calendar-week-grid tools-preview-calendar-grid">
            <div className="tools-calendar-time-corner" />
            {DAYS.map((d) => (
              <button
                key={d.label}
                type="button"
                className={`tools-calendar-day-head${d.today ? ' tools-preview-calendar-today-head' : ''}`}
                tabIndex={-1}
              >
                <span>{d.label}</span>
                <span className="tools-calendar-day-num">{d.num}</span>
              </button>
            ))}
            <div className="tools-calendar-time-col">
              {HOURS.map((h) => (
                <div key={h} className="tools-calendar-time-label">{h}</div>
              ))}
            </div>
            {DAYS.map((d, dayIndex) => (
              <div key={d.label} className="tools-calendar-day-lane tools-preview-calendar-lane">
                {EVENTS.filter((ev) => ev.day === dayIndex).map((ev) => (
                  <div
                    key={ev.title}
                    className="tools-calendar-event tools-preview-calendar-event"
                    style={{
                      top: ev.top,
                      height: ev.height,
                      background: `${ev.color}22`,
                      borderColor: ev.color,
                    }}
                  >
                    <div className="tools-calendar-event-title">{ev.title}</div>
                    <div className="tools-calendar-event-time">{ev.time}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
