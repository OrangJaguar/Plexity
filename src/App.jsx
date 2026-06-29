import { BrowserRouter } from 'react-router-dom';
import QueryProvider from '@/providers/QueryProvider';
import AuthProvider from '@/providers/AuthProvider';
import QueryPersistManager from '@/components/providers/QueryPersistManager';
import RouteErrorBoundary from '@/components/errors/RouteErrorBoundary';
import GlobalErrorHandlers from '@/components/errors/GlobalErrorHandlers';
import { Toaster } from '@/components/ui/sonner';
import AppRoutes from '@/AppRoutes';
import '@/css/app.css';
import '@/index.css';

/**
 * Canonical app shell — imported by root App.jsx (Base44 preview) and main.jsx (local Vite).
 */
export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <QueryPersistManager>
          <GlobalErrorHandlers />
          <div className="app-root-shell">
            <BrowserRouter>
              <RouteErrorBoundary>
                <div className="app-router-outlet">
                  <AppRoutes />
                </div>
              </RouteErrorBoundary>
            </BrowserRouter>
            <Toaster />
          </div>
        </QueryPersistManager>
      </AuthProvider>
    </QueryProvider>
  );
}
