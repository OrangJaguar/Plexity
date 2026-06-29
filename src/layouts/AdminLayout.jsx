import { Link, Outlet } from 'react-router-dom';
import VeridianLogo from '@/components/layout/VeridianLogo';

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <header className="admin-layout-header">
        <Link to="/" className="admin-layout-brand" title="Veridian Tools home">
          <VeridianLogo size={28} />
          <span>Veridian Admin</span>
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
