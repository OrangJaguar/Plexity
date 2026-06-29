import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import VeridianLoading from '@/components/shared/VeridianLoading';
import AdminAccessDenied from '@/pages/admin/AdminAccessDenied';

export default function RequireAdmin() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <VeridianLoading fullPage />;
  if (!user) return <Navigate to="/signin?redirect=%2Fadmin" replace />;
  if (user.role !== 'admin') return <AdminAccessDenied />;

  return <Outlet />;
}
