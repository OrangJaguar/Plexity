import { Link } from 'react-router-dom';
import { useScopedToolRoutes } from '@/hooks/useScopedToolRoutes';
import { ADMIN_FEEDBACK_ROUTE } from '@/lib/tools/tool-surface';

/**
 * Compact admin-surface indicator. Does not authorize anything —
 * only shown when ToolSurfaceProvider is set to admin.
 */
export default function AdminSurfaceBadge({ compact = false }) {
  const { toolsHome } = useScopedToolRoutes();

  if (compact) {
    return (
      <div className="admin-surface-badge admin-surface-badge--compact" role="status">
        <span className="admin-surface-badge-label">Admin</span>
        <Link to={ADMIN_FEEDBACK_ROUTE} className="admin-surface-badge-link">Feedback</Link>
        <Link to="/dashboard" className="admin-surface-badge-link">Exit</Link>
      </div>
    );
  }

  return (
    <div className="admin-surface-badge" role="status">
      <span className="admin-surface-badge-label">Admin</span>
      <Link to={ADMIN_FEEDBACK_ROUTE} className="admin-surface-badge-link">Feedback</Link>
      <Link to="/dashboard" className="admin-surface-badge-link" title="Leave admin surface">
        Exit
      </Link>
      <span className="admin-surface-badge-home" aria-hidden>
        {toolsHome()}
      </span>
    </div>
  );
}
