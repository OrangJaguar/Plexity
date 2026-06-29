import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function LocalOnlyBanner() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || isAuthenticated) return null;

  const redirect = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="local-only-banner" role="status">
      <span>Local only · Sign in to sync across devices</span>
      <Link to={`/signin?redirect=${redirect}`} className="local-only-banner-link">
        Sign in
      </Link>
    </div>
  );
}
