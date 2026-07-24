import { Navigate, Route } from 'react-router-dom';
import { TOOL_PAGE_REGISTRY } from '@/lib/tools/tool-page-registry';
import ToolCapabilityRoute from '@/components/routing/ToolCapabilityRoute';
import ToolsCatalogPage from '@/pages/tools/ToolsCatalogPage';
import ToolsSettingsPage from '@/pages/tools/ToolsSettingsPage';
import { withSurfacePath } from '@/lib/tools/tool-surface';
import { TOOL_CATALOG_ROUTE } from '@/lib/tools/registry';
import { TOOLS_SETTINGS_ROUTE } from '@/lib/tools/tool-routes';

/**
 * Generate tool + support routes for a surface.
 * Same Page components for public and admin — only the path prefix differs.
 *
 * @param {{ basePath?: string }} [opts]
 * @returns {import('react').ReactElement[]}
 */
export function buildToolRoutes({ basePath = '' } = {}) {
  const toolRoutes = TOOL_PAGE_REGISTRY.map(({ id, route, Page, wildcard }) => {
    const path = withSurfacePath(wildcard ? `${route}/*` : route, { basePath });
    return (
      <Route
        key={`${basePath || 'public'}-${id}`}
        path={path}
        element={(
          <ToolCapabilityRoute toolId={id}>
            <Page />
          </ToolCapabilityRoute>
        )}
      />
    );
  });

  const catalogPath = withSurfacePath(TOOL_CATALOG_ROUTE, { basePath });
  const settingsPath = withSurfacePath(TOOLS_SETTINGS_ROUTE, { basePath });

  return [
    ...toolRoutes,
    <Route
      key={`${basePath || 'public'}-catalog`}
      path={catalogPath}
      element={(
        <ToolCapabilityRoute toolId="catalog">
          <ToolsCatalogPage />
        </ToolCapabilityRoute>
      )}
    />,
    <Route
      key={`${basePath || 'public'}-settings`}
      path={settingsPath}
      element={(
        <ToolCapabilityRoute toolId="settings">
          <ToolsSettingsPage />
        </ToolCapabilityRoute>
      )}
    />,
  ];
}

/**
 * @param {{ basePath?: string, to?: string }} [opts]
 */
export function buildAdminHomeRedirect({ basePath = '/admin', to = '/admin/dashboard' } = {}) {
  return (
    <Route
      key="admin-home-redirect"
      path={basePath}
      element={<Navigate to={to} replace />}
    />
  );
}
