import { useLocation } from 'react-router-dom';
import { Settings, Command } from 'lucide-react';
import {
  getToolsNavItems,
  TOOLS_CATALOG_NAV_ITEM,
} from '@/components/app-shell/tools-nav-items';
import SidebarNavLink from '@/components/app-shell/SidebarNavLink';
import ToolsCatalogNavIcon from '@/components/app-shell/ToolsCatalogNavIcon';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';
import { useCommandBar } from '@/components/command-bar/CommandBarProvider';
import { useScopedToolRoutes } from '@/hooks/useScopedToolRoutes';
import { normalizeToolPathname } from '@/lib/tools/tool-routes';

export default function ToolsAppSidebarMobile() {
  const location = useLocation();
  const { pinnedToolIds } = usePinnedTools();
  const { openBar } = useCommandBar();
  const { catalogRoute, settingsRoute, toolRoute } = useScopedToolRoutes();
  const items = getToolsNavItems(pinnedToolIds, { toolRoute, excludeDesktopOnly: true });
  const catalogTo = catalogRoute();
  const settingsTo = settingsRoute();
  const canonicalPath = normalizeToolPathname(location.pathname);

  return (
    <nav className="app-sidebar-mobile app-sidebar-mobile--tools">
      <SidebarNavLink
        to={catalogTo}
        label="Catalog"
        icon={ToolsCatalogNavIcon}
        rawIcon
        end={canonicalPath === TOOLS_CATALOG_NAV_ITEM.to}
      />
      {items.map(({ to, label, icon, sidebarIconActive, canonicalRoute }) => (
        <SidebarNavLink
          key={to}
          to={to}
          label={label}
          icon={icon}
          sidebarIconActive={sidebarIconActive}
          end={canonicalRoute === '/dashboard'}
        />
      ))}
      <button
        type="button"
        className="app-sidebar-link app-sidebar-mobile-command"
        onClick={openBar}
        aria-label="Open command bar"
      >
        <Command size={20} strokeWidth={1.75} />
      </button>
      <SidebarNavLink
        to={settingsTo}
        label="Settings"
        icon={Settings}
        end={canonicalPath === '/settings'}
      />
    </nav>
  );
}
