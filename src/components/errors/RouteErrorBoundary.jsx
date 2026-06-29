import { useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/errors/ErrorBoundary';

/** Remount the error boundary on navigation so one broken page doesn't brick the whole app. */
export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}
