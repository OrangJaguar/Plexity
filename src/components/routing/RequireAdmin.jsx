import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import AppLoading from '@/components/shared/AppLoading';
import AdminAccessDenied from '@/pages/admin/AdminAccessDenied';

export default function RequireAdmin() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AppLoading fullPage />;
  if (!user) return <Navigate to="/signin?redirect=%2Fadmin" replace />;
  if (user.role !== 'admin') return <AdminAccessDenied />;

  return <Outlet />;
}
