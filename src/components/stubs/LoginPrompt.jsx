import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPrompt({ action = 'use this feature' }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading || user) return null;

  const redirect = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="login-prompt">
      <p>Sign in to {action}.</p>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to={`/signin?redirect=${redirect}`} className="btn btn-primary">
          Sign in
        </Link>
        <Link to="/signup" className="btn">
          Create account
        </Link>
      </div>
    </div>
  );
}
