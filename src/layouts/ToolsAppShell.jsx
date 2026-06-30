import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHubToggleShortcut } from '@/hooks/useHubToggleShortcut';
import { useAuth } from '@/hooks/useAuth';
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

export default function ToolsAppShell() {
  const isMobile = useIsMobile();
  const { user, isLoading: authLoading } = useAuth();
  useHubToggleShortcut();
  const toolsChromeCollapsed = useUiStore((s) => s.toolsChromeCollapsed);
  const hideChrome = toolsChromeCollapsed;
  const signedIn = Boolean(user);
  const showChrome = signedIn && !hideChrome;

  useEffect(() => {
    applyThemeFromStorage();
  }, []);

  const shellClass = [
    'app-shell',
    isMobile ? 'app-shell--mobile' : '',
    hideChrome ? 'app-shell--tools-immersive' : '',
    !signedIn && !authLoading ? 'app-shell--unsigned' : '',
  ].filter(Boolean).join(' ');

  return (
    <CommandBarProvider>
      <div className={shellClass}>
        <ThemeSync />
        <SyncUserDisplayName />
        {showChrome && !isMobile && <ToolsAppSidebar />}
        {!signedIn && !authLoading && !isMobile && (
          <Link to="/" className="tools-auth-gate-logo" title="Plexity home">
            <PlexityLogo size={32} />
          </Link>
        )}
        <div className="app-shell-main">
          {showChrome && isMobile && (
            <header className="site-header app-shell-mobile-header">
              <Link to="/" className="app-sidebar-logo-link" title="Plexity home">
                <PlexityLogo size={32} />
              </Link>
            </header>
          )}
          <main className="app-shell-content">
            <Outlet />
          </main>
          {showChrome && (
            <div className="app-shell-bottom-chrome">
              <AppFooter />
              {isMobile && <ToolsAppSidebarMobile />}
            </div>
          )}
        </div>
        {signedIn && <ToolsChromeToggle isMobile={isMobile} />}
      </div>
    </CommandBarProvider>
  );
}
