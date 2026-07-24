import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import PlexityLogo from '@/components/layout/PlexityLogo';
import {
  getToolsNavItems,
  TOOLS_CATALOG_NAV_ITEM,
} from '@/components/app-shell/tools-nav-items';
import SidebarNavLink from '@/components/app-shell/SidebarNavLink';
import ToolsSidebarNav from '@/components/app-shell/ToolsSidebarNav';
import ToolsCatalogNavIcon from '@/components/app-shell/ToolsCatalogNavIcon';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';
import { useScopedToolRoutes } from '@/hooks/useScopedToolRoutes';
import { useOptionalToolSurface } from '@/hooks/useToolSurface';
import AdminSurfaceBadge from '@/components/admin/AdminSurfaceBadge';
import { normalizeToolPathname } from '@/lib/tools/tool-routes';

export default function ToolsAppSidebar() {
  const location = useLocation();
  const { pinnedToolIds } = usePinnedTools();
  const { catalogRoute, settingsRoute, toolRoute } = useScopedToolRoutes();
  const { isAdminSurface } = useOptionalToolSurface();
  const items = getToolsNavItems(pinnedToolIds, { toolRoute });
  const catalogTo = catalogRoute();
  const settingsTo = settingsRoute();
  const canonicalPath = normalizeToolPathname(location.pathname);

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-wordmark">
        <Link to="/" className="app-sidebar-logo-link" title="Plexity home">
          <PlexityLogo size={28} />
        </Link>
      </div>
      {isAdminSurface && (
        <div className="app-sidebar-admin-badge-slot">
          <AdminSurfaceBadge />
        </div>
      )}
      <div className="tools-sidebar-catalog-slot">
        <SidebarNavLink
          to={catalogTo}
          label="Catalog"
          icon={ToolsCatalogNavIcon}
          rawIcon
          end={canonicalPath === TOOLS_CATALOG_NAV_ITEM.to}
          className="app-sidebar-link tools-sidebar-catalog-link"
        />
      </div>
      <ToolsSidebarNav items={items} />
      <div className="app-sidebar-footer">
        <SidebarNavLink
          to={settingsTo}
          label="Settings"
          icon={Settings}
          end={canonicalPath === '/settings'}
        />
      </div>
    </aside>
  );
}
