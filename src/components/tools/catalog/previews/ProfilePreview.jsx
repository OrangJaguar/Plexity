export default function ProfilePreview() {
  return (
    <div className="tools-preview-scale tools-preview-profile">
      <div className="tools-profile-preview-layout tools-profile-preview-layout--hub">
        <header className="tools-profile-preview-hero tools-profile-preview-hero--hub">
          <div className="tools-profile-preview-avatar">A</div>
          <div>
            <h3>Alex Morgan</h3>
            <p className="tools-profile-preview-headline">Student · builder · biology curious</p>
            <p className="tools-profile-preview-bio">Junior focused on research and design. Building projects while keeping daily habits strong.</p>
          </div>
        </header>
        <div className="tools-profile-preview-highlights">
          <span><small>Current focus</small>Research portfolio</span>
          <span><small>Main project</small>Study app prototype</span>
          <span><small>Target path</small>Pre-med + design</span>
        </div>
        <div className="tools-profile-preview-grid tools-profile-preview-grid--hub">
          <section className="tools-profile-preview-card">
            <h4>Interests</h4>
            <div className="tools-profile-preview-tags">
              <span>Biology</span><span>Design</span><span>Startups</span>
            </div>
          </section>
          <section className="tools-profile-preview-card">
            <h4>Education</h4>
            <p><strong>Lincoln High</strong> · Class of 2027</p>
          </section>
          <section className="tools-profile-preview-card tools-profile-preview-card--wide">
            <h4>Projects</h4>
            <ul>
              <li><strong>Campus garden initiative</strong><span>Lead · 2025</span></li>
              <li><strong>AP Bio study group</strong><span>Organizer · 2024–25</span></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
