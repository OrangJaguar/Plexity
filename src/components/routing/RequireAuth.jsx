import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLoading from '@/components/shared/AppLoading';
import LoginPrompt from '@/components/stubs/LoginPrompt';

/** Blocks tool routes until the user is signed in. */
export default function RequireAuth({ action = 'use Plexity tools' }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AppLoading fullPage />;
  if (!user) return <LoginPrompt action={action} />;

  return <Outlet />;
}
