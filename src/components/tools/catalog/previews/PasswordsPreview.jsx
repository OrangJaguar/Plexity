export default function PasswordsPreview() {
  return (
    <div className="tools-preview-scale tools-preview-passwords">
      <div className="tools-passwords-preview-layout tools-passwords-preview-layout--vault">
        <header className="tools-passwords-preview-head">
          <strong>Vault</strong>
          <span className="tools-preview-pill tools-preview-pill--secure">Encrypted</span>
        </header>
        <div className="tools-passwords-preview-search-bar">Search credentials…</div>
        <ul className="tools-passwords-preview-list">
          <li><span>School email</span><span className="muted">alex@…</span></li>
          <li><span>GitHub</span><span className="muted">dev@…</span></li>
          <li><span>College portal</span><span className="muted">portal@…</span></li>
        </ul>
      </div>
    </div>
  );
}
