import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import PublicOnly from '@/components/routing/PublicOnly';
import AuthForm from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { touchLastActive } from '@/api/entities/preferences';
import { onAuthSuccess } from '@/lib/auth/post-auth-success';

export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { setUser } = useAuth();
  const resetMessage = location.state?.message;

  async function handleSuccess(user) {
    await onAuthSuccess();
    setUser(user);
    touchLastActive().catch(() => {});
    const redirect = searchParams.get('redirect');
    navigate(redirect && redirect.startsWith('/') ? redirect : '/dashboard', { replace: true });
  }

  return (
    <PublicOnly>
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
          Sign in to Plexity
        </h1>
        {resetMessage && (
          <div className="auth-banner auth-banner-info" style={{ marginBottom: '1rem' }}>
            {resetMessage}
          </div>
        )}
        <AuthForm defaultTab="login" onSuccess={handleSuccess} />
      </div>
    </PublicOnly>
  );
}