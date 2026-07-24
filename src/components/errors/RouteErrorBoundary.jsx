import { useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/errors/ErrorBoundary';

const TOOL_TITLES = {
  '/stocks': 'Stocks',
  '/pdf': 'PDF tools',
  '/calculator': 'Calculator',
  '/tasks': 'Tasks',
  '/calendar': 'Calendar',
  '/convert': 'Converter',
};

function toolTitleForPath(pathname) {
  const route = pathname.startsWith('/admin/') ? pathname.slice('/admin'.length) : pathname;
  const match = Object.entries(TOOL_TITLES).find(([prefix]) => route === prefix || route.startsWith(`${prefix}/`));
  return match ? match[1] : null;
}

/** Remount the error boundary on navigation so one broken page doesn't brick the whole app. */
export default function RouteErrorBoundary({ children }) {
  const location = useLocation();
  const tool = toolTitleForPath(location.pathname);
  const title = tool ? `${tool} hit a snag` : 'Something went wrong';
  const message = tool
    ? `Something broke while loading ${tool}. You can try again or go back to the dashboard.`
    : "We've logged this issue. Try again or head back to the dashboard.";

  return (
    <ErrorBoundary
      key={location.pathname}
      resetKey={location.pathname}
      title={title}
      message={message}
    >
      {children}
    </ErrorBoundary>
  );
}
