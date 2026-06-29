import { Link } from 'react-router-dom';

export default function LegalPageShell({ title, updated, children }) {
  return (
    <div className="legal-page-wrap">
      <article className="legal-page">
        <header className="legal-page-header">
          <p className="legal-page-eyebrow">Veridian Tools</p>
          <h1>{title}</h1>
          {updated ? <p className="legal-page-updated">Last updated {updated}</p> : null}
        </header>
        <div className="legal-page-body">
          {children}
        </div>
        <footer className="legal-page-footer">
          <Link to="/">← Back to home</Link>
        </footer>
      </article>
    </div>
  );
}
