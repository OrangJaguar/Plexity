import { Navigate, useLocation } from 'react-router-dom';
import { legacyToolsPathToCanonical } from '@/lib/tools/tool-routes';

export default function LegacyToolsRedirect() {
  const { pathname, search, hash } = useLocation();
  const to = `${legacyToolsPathToCanonical(pathname)}${search}${hash}`;
  return <Navigate to={to} replace />;
}
