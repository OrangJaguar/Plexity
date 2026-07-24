import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLoading from '@/components/shared/AppLoading';
import AdminAccessDenied from '@/pages/admin/AdminAccessDenied';

export default function RequireAdmin() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppLoading fullPage />;

  if (!user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    const params = new URLSearchParams({ redirect });
    return <Navigate to={`/signin?${params.toString()}`} replace />;
  }

  if (user.role !== 'admin') return <AdminAccessDenied />;

  return <Outlet />;
}
