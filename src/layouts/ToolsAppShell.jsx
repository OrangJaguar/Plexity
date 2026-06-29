import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHubToggleShortcut } from '@/hooks/useHubToggleShortcut';
import { useUiStore } from '@/store/uiStore';
import ToolsAppSidebar from '@/components/app-shell/ToolsAppSidebar';
import ToolsAppSidebarMobile from '@/components/app-shell/ToolsAppSidebarMobile';
import AppFooter from '@/components/layout/AppFooter';
import { CommandBarProvider } from '@/components/command-bar/CommandBarProvider';
import PlexityLogo from '@/components/layout/PlexityLogo';
import ThemeSync from '@/components/ThemeSync';
import SyncUserDisplayName from '@/components/auth/SyncUserDisplayName';
import { applyThemeFromStorage } from '@/lib/theme';
import ToolsChromeToggle from '@/components/tools/chrome/ToolsChromeToggle';
import GuestLocalNotice from '@/components/guest/GuestLocalNotice';
import LocalOnlyBanner from '@/components/guest/LocalOnlyBanner';

export default function ToolsAppShell() {
  const isMobile = useIsMobile();
  useHubToggleShortcut();
  const toolsChromeCollapsed = useUiStore((s) => s.toolsChromeCollapsed);
  const hideChrome = toolsChromeCollapsed;

  useEffect(() => {
    applyThemeFromStorage();
  }, []);

  const shellClass = [
    'app-shell',
    isMobile ? 'app-shell--mobile' : '',
    hideChrome ? 'app-shell--tools-immersive' : '',
  ].filter(Boolean).join(' ');

  return (
    <CommandBarProvider>
      <div className={shellClass}>
        <ThemeSync />
        <SyncUserDisplayName />
        <GuestLocalNotice />
        {!hideChrome && !isMobile && <ToolsAppSidebar />}
        <div className="app-shell-main">
          {!hideChrome && isMobile && (
            <header className="site-header app-shell-mobile-header">
              <Link to="/" className="app-sidebar-logo-link" title="Plexity home">
                <PlexityLogo size={32} />
              </Link>
            </header>
          )}
          <LocalOnlyBanner />
          <main className="app-shell-content">
            <Outlet />
          </main>
          {!hideChrome && (
            <div className="app-shell-bottom-chrome">
              <AppFooter />
              {isMobile && <ToolsAppSidebarMobile />}
            </div>
          )}
        </div>
        <ToolsChromeToggle isMobile={isMobile} />
      </div>
    </CommandBarProvider>
  );
}
