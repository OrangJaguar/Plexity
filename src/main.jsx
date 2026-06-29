import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import QueryProvider from '@/providers/QueryProvider';
import AuthProvider from '@/providers/AuthProvider';
import QueryPersistManager from '@/components/providers/QueryPersistManager';
import RouteErrorBoundary from '@/components/errors/RouteErrorBoundary';
import GlobalErrorHandlers from '@/components/errors/GlobalErrorHandlers';
import { Toaster } from '@/components/ui/sonner';
import '@/css/app.css';
import '@/index.css';
import { applyThemeFromStorage } from '@/lib/theme';

applyThemeFromStorage();

ReactDOM.createRoot(document.getElementById('root')).render(
  <QueryProvider>
    <AuthProvider>
      <QueryPersistManager>
        <GlobalErrorHandlers />
        <div className="app-root-shell">
          <BrowserRouter>
            <RouteErrorBoundary>
              <div className="app-router-outlet">
                <App />
              </div>
            </RouteErrorBoundary>
          </BrowserRouter>
          <Toaster />
        </div>
      </QueryPersistManager>
    </AuthProvider>
  </QueryProvider>,
);
