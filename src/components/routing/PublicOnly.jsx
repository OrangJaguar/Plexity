import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function PublicOnly({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to="/home" replace />;

  return children;
}
