import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TOOLS_HOME } from '@/lib/tools/tool-routes';

export default function PublicOnly({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to={TOOLS_HOME} replace />;

  return children;
}
