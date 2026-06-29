import { Link } from 'react-router-dom';

export default function AppFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="site-footer-copy">
          Copyright © 2026 Developed by Sanskar Gupta. All Rights Reserved.
        </p>
        <nav className="site-footer-links" aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/feedback">Feedback</Link>
          <span aria-hidden="true">·</span>
          <Link to="/terms">Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
