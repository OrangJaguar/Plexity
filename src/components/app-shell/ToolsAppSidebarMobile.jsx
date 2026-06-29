import { useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import {
  getToolsNavItems,
  TOOLS_CATALOG_NAV_ITEM,
  TOOLS_SETTINGS_ROUTE,
} from '@/components/app-shell/tools-nav-items';
import SidebarNavLink from '@/components/app-shell/SidebarNavLink';
import ToolsCatalogNavIcon from '@/components/app-shell/ToolsCatalogNavIcon';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';

export default function ToolsAppSidebarMobile() {
  const location = useLocation();
  const { pinnedToolIds } = usePinnedTools();
  const items = getToolsNavItems(pinnedToolIds);

  return (
    <nav className="app-sidebar-mobile">
      <SidebarNavLink
        to={TOOLS_CATALOG_NAV_ITEM.to}
        label="Catalog"
        icon={ToolsCatalogNavIcon}
        rawIcon
        end={location.pathname === TOOLS_CATALOG_NAV_ITEM.to}
      />
      {items.map(({ to, label, icon }) => (
        <SidebarNavLink
          key={to}
          to={to}
          label={label}
          icon={icon}
          end={location.pathname === to}
        />
      ))}
      <SidebarNavLink
        to={TOOLS_SETTINGS_ROUTE}
        label="Settings"
        icon={Settings}
        end={location.pathname === TOOLS_SETTINGS_ROUTE}
      />
    </nav>
  );
}
