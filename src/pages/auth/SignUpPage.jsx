import { useNavigate } from 'react-router-dom';
import PublicOnly from '@/components/routing/PublicOnly';
import AuthForm from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { touchLastActive } from '@/api/entities/preferences';

export default function SignUpPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();

  function handleSuccess(user) {
    setUser(user);
    touchLastActive().catch(() => {});
    navigate('/dashboard', { replace: true });
  }

  return (
    <PublicOnly>
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>
          Create an account
        </h1>
        <AuthForm defaultTab="signup" onSuccess={handleSuccess} />
      </div>
    </PublicOnly>
  );
}