import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import PlexityLogo from '@/components/layout/PlexityLogo';
import { ADMIN_HOME, ADMIN_FEEDBACK_ROUTE } from '@/lib/tools/tool-surface';

export const ADMIN_BRAWL_EDIT_ROUTE = '/admin/brawledit';

const ADMIN_NAV = [
  { value: ADMIN_HOME, label: 'Tools' },
  { value: ADMIN_FEEDBACK_ROUTE, label: 'Feedback' },
  { value: ADMIN_BRAWL_EDIT_ROUTE, label: 'Brawl' },
];

function AdminNavSlider() {
  const { pathname } = useLocation();
  const activeIndex = Math.max(
    0,
    ADMIN_NAV.findIndex((o) => {
      if (o.value === ADMIN_HOME) return pathname === ADMIN_HOME || pathname === '/admin' || pathname === '/admin/';
      return pathname === o.value || pathname.startsWith(`${o.value}/`);
    }),
  );
  const count = ADMIN_NAV.length;

  return (
    <div
      className="tools-brawl-slider tools-brawl-slider--chrome admin-layout-slider"
      role="navigation"
      aria-label="Admin sections"
      data-active-index={activeIndex}
      style={{ '--brawl-slider-count': String(count) }}
    >
      <div className="tools-brawl-slider-track">
        <div
          className="tools-brawl-slider-thumb"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
          aria-hidden
        />
        {ADMIN_NAV.map((opt) => (
          <NavLink
            key={opt.value}
            to={opt.value}
            className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            end={opt.value === ADMIN_HOME}
          >
            <span>{opt.label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <header className="admin-layout-header">
        <Link to="/" className="admin-layout-brand" title="Plexity home">
          <PlexityLogo size={28} />
          <span>Plexity Admin</span>
        </Link>
        <AdminNavSlider />
      </header>
      <main className="admin-layout-main">
        <div className="admin-layout-main-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
