import { Link, Outlet } from 'react-router-dom';
import PlexityLogo from '@/components/layout/PlexityLogo';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <header className="admin-layout-header">
        <Link to="/" className="admin-layout-brand" title="Plexity home">
          <PlexityLogo size={28} />
          <span>Plexity Admin</span>
        </Link>
        <nav className="admin-layout-nav" aria-label="Admin">
          <Link to="/admin/feedback" className="admin-layout-nav-link">Feedback</Link>
        </nav>
      </header>
      <main className="admin-layout-main">
        <Outlet />
      </main>
    </div>
  );
}
