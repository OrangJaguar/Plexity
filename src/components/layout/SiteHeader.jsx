import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';
import { TOOL_CATALOG_ROUTE } from '@/lib/tools/registry';
import PlexityLogo from '@/components/layout/PlexityLogo';

export default function SiteHeader({ actions, showLogo = false }) {
  const { user, isLoading } = useAuth();
  const { pinnedTools } = usePinnedTools();
  const appEntryRoute = pinnedTools.length > 0 ? pinnedTools[0].route : TOOL_CATALOG_ROUTE;

  const defaultActions = !isLoading && (
    user ? (
      <Link to={appEntryRoute} className="btn btn-primary site-header-cta">
        Go to App
      </Link>
    ) : (
      <>
        <Link to="/signin" className="btn site-header-cta">
          Sign in
        </Link>
        <Link to="/signup" className="btn btn-primary site-header-cta">
          Get Started
        </Link>
      </>
    )
  );

  return (
    <header className="site-header">
      <Link to="/" className={`site-wordmark${showLogo ? ' site-wordmark--brand' : ''}`}>
        {showLogo ? (
          <>
            <PlexityLogo size={28} alt="" />
            <span>Plexity</span>
          </>
        ) : (
          'Plexity'
        )}
      </Link>
      <div className="site-header-actions">
        {actions ?? defaultActions}
      </div>
    </header>
  );
}