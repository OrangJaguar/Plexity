export default function GoalsPreview() {
  return (
    <div className="tools-preview-scale tools-preview-goals">
      <div className="tools-goals-preview-layout tools-goals-preview-layout--strategy">
        <header className="tools-goals-preview-strategy">
          <div>
            <small>North Star</small>
            <p>Build meaningful work, stay healthy, leave room to explore.</p>
          </div>
          <div className="tools-goals-preview-pillars">
            <span>1 Health</span>
            <span>2 Education</span>
            <span>3 Career</span>
          </div>
        </header>
        <section className="tools-goals-preview-season">
          <small>Current season</small>
          <strong>Junior year sprint</strong>
          <p>Research portfolio + strong grades</p>
        </section>
        <section className="tools-goals-preview-weekly">
          <header>
            <div>
              <h3>This week</h3>
              <p>Week of Jun 23</p>
            </div>
            <span className="tools-preview-pill">Check-in</span>
          </header>
          <ol>
            <li>Draft research abstract</li>
            <li>Two deep study blocks for AP Bio</li>
            <li>Reach out to mentor</li>
          </ol>
        </section>
      </div>
    </div>
  );
}
