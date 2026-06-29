import { Link, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import PlexityLogo from '@/components/layout/PlexityLogo';
import {
  getToolsNavItems,
  TOOLS_CATALOG_NAV_ITEM,
  TOOLS_SETTINGS_ROUTE,
} from '@/components/app-shell/tools-nav-items';
import SidebarNavLink from '@/components/app-shell/SidebarNavLink';
import ToolsSidebarNav from '@/components/app-shell/ToolsSidebarNav';
import ToolsCatalogNavIcon from '@/components/app-shell/ToolsCatalogNavIcon';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';

export default function ToolsAppSidebar() {
  const location = useLocation();
  const { pinnedToolIds } = usePinnedTools();
  const items = getToolsNavItems(pinnedToolIds);

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-wordmark">
        <Link to="/" className="app-sidebar-logo-link" title="Plexity home">
          <PlexityLogo size={28} />
        </Link>
      </div>
      <div className="tools-sidebar-catalog-slot">
        <SidebarNavLink
          to={TOOLS_CATALOG_NAV_ITEM.to}
          label="Catalog"
          icon={ToolsCatalogNavIcon}
          rawIcon
          end={location.pathname === TOOLS_CATALOG_NAV_ITEM.to}
          className="app-sidebar-link tools-sidebar-catalog-link"
        />
      </div>
      <ToolsSidebarNav items={items} />
      <div className="app-sidebar-footer">
        <SidebarNavLink
          to={TOOLS_SETTINGS_ROUTE}
          label="Settings"
          icon={Settings}
          end={location.pathname === TOOLS_SETTINGS_ROUTE}
        />
      </div>
    </aside>
  );
}
