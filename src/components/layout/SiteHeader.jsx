import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePinnedTools } from '@/hooks/queries/usePinnedTools';

function toFlatRoute(route) {
  return route.startsWith('/tools/') ? route.slice(6) : route;
}

export default function SiteHeader({ actions, showLogo = false }) {
  const { user, isLoading } = useAuth();
  const { pinnedTools } = usePinnedTools();
  const appEntryRoute = pinnedTools.length > 0 ? toFlatRoute(pinnedTools[0].route) : '/catalog';

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
            <img src="/veridian-logo.png" alt="" width={28} height={28} className="veridian-logo" draggable={false} />
            <span>Veridian Tools</span>
          </>
        ) : (
          'Veridian Tools'
        )}
      </Link>
      <div className="site-header-actions">
        {actions ?? defaultActions}
      </div>
    </header>
  );
}