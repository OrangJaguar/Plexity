import { useCallback, useMemo } from 'react';
import { useOptionalToolSurface } from '@/hooks/useToolSurface';
import {
  getCatalogRoute,
  getPdfRoute,
  getSettingsRoute,
  getToolRoute,
  getToolsHome,
  stocksRoute,
  stocksSymbolRoute,
} from '@/lib/tools/tool-routes';

/**
 * Scope-aware route builders for React components inside a tool surface.
 */
export function useScopedToolRoutes() {
  const { surface, basePath } = useOptionalToolSurface();
  const opts = useMemo(() => ({ surface, basePath }), [surface, basePath]);

  return {
    surface,
    basePath,
    toolRoute: useCallback((id) => getToolRoute(id, opts), [opts]),
    catalogRoute: useCallback(() => getCatalogRoute(opts), [opts]),
    settingsRoute: useCallback((search) => getSettingsRoute({ ...opts, search }), [opts]),
    pdfRoute: useCallback(() => getPdfRoute(opts), [opts]),
    toolsHome: useCallback(() => getToolsHome(opts), [opts]),
    stocksRoute: useCallback((...segments) => stocksRoute(...segments, opts), [opts]),
    stocksSymbolRoute: useCallback(
      (symbol, routeOpts) => stocksSymbolRoute(symbol, { ...routeOpts, ...opts }),
      [opts],
    ),
  };
}
