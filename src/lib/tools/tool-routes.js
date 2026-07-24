import { TOOL_CATALOG_ROUTE, TOOL_REGISTRY } from '@/lib/tools/registry';
import {
  ADMIN_BASE_PATH,
  ADMIN_MANAGEMENT_ROUTES,
  basePathForSurface,
  isAdminSurfacePath,
  stripAdminPrefix,
  withSurfacePath,
} from '@/lib/tools/tool-surface';

export const TOOLS_HOME = '/dashboard';
export const TOOLS_SETTINGS_ROUTE = '/settings';
export const PDF_ROUTE = '/pdf';

export {
  ADMIN_BASE_PATH,
  ADMIN_FEEDBACK_ROUTE,
  ADMIN_HOME,
  ADMIN_MANAGEMENT_ROUTES,
  basePathForSurface,
  isAdminSurfacePath,
  stripAdminPrefix,
  withSurfacePath,
} from '@/lib/tools/tool-surface';

export const MARKETING_ROUTES = [
  '/',
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/feedback',
];

/**
 * Map legacy /tools/* paths to canonical flat routes.
 * @param {string} pathname
 */
export function legacyToolsPathToCanonical(pathname) {
  if (!pathname || pathname === '/tools' || pathname === '/tools/') {
    return TOOLS_HOME;
  }
  if (!pathname.startsWith('/tools/')) {
    return pathname;
  }

  const rest = pathname.slice('/tools/'.length);
  if (rest === 'pdftools' || rest.startsWith('pdftools/')) {
    const suffix = rest === 'pdftools' ? '' : rest.slice('pdftools'.length);
    return suffix ? `${PDF_ROUTE}${suffix}` : PDF_ROUTE;
  }
  if (rest === 'pdf') {
    return PDF_ROUTE;
  }

  return `/${rest}`;
}

/**
 * Normalize to a public/canonical tool pathname for page identity.
 * Strips /admin for mirrored tools; preserves management routes.
 * @param {string} pathname
 */
export function normalizeToolPathname(pathname) {
  const stripped = stripAdminPrefix(pathname || '/');
  return legacyToolsPathToCanonical(stripped);
}

/**
 * @param {import('@/lib/tools/registry').ToolId} id
 * @param {{ basePath?: string, surface?: import('@/lib/tools/tool-surface').ToolSurface }} [opts]
 */
export function getToolRoute(id, opts = {}) {
  const canonical = TOOL_REGISTRY.find((t) => t.id === id)?.route ?? TOOLS_HOME;
  return withSurfacePath(canonical, opts);
}

/**
 * @param {...string} segments
 */
export function stocksRoute(...segments) {
  const last = segments[segments.length - 1];
  const opts = last && typeof last === 'object' && !Array.isArray(last) ? segments.pop() : {};
  const path = segments.filter(Boolean).join('/');
  const canonical = path ? `/stocks/${path}` : '/stocks';
  return withSurfacePath(canonical, opts);
}

/**
 * @param {string} symbol
 * @param {{ tab?: string, basePath?: string, surface?: import('@/lib/tools/tool-surface').ToolSurface }} [opts]
 */
export function stocksSymbolRoute(symbol, { tab, basePath, surface } = {}) {
  const base = withSurfacePath(`/stocks/symbol/${encodeURIComponent(symbol)}`, { basePath, surface });
  if (!tab) return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

/**
 * @param {{ basePath?: string, surface?: import('@/lib/tools/tool-surface').ToolSurface }} [opts]
 */
export function getCatalogRoute(opts = {}) {
  return withSurfacePath(TOOL_CATALOG_ROUTE, opts);
}

/**
 * @param {{ basePath?: string, surface?: import('@/lib/tools/tool-surface').ToolSurface, search?: string }} [opts]
 */
export function getSettingsRoute(opts = {}) {
  const path = withSurfacePath(TOOLS_SETTINGS_ROUTE, opts);
  if (!opts.search) return path;
  const search = opts.search.startsWith('?') ? opts.search : `?${opts.search}`;
  return `${path}${search}`;
}

/**
 * @param {{ basePath?: string, surface?: import('@/lib/tools/tool-surface').ToolSurface }} [opts]
 */
export function getPdfRoute(opts = {}) {
  return withSurfacePath(PDF_ROUTE, opts);
}

/**
 * @param {{ basePath?: string, surface?: import('@/lib/tools/tool-surface').ToolSurface }} [opts]
 */
export function getToolsHome(opts = {}) {
  return withSurfacePath(TOOLS_HOME, opts);
}

/**
 * @param {string} pathname
 */
export function isToolsRoute(pathname) {
  if (!pathname || MARKETING_ROUTES.includes(pathname)) {
    return false;
  }

  if (ADMIN_MANAGEMENT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return false;
  }

  if (pathname === ADMIN_BASE_PATH || pathname === `${ADMIN_BASE_PATH}/`) {
    return true;
  }

  const canonical = normalizeToolPathname(pathname);
  const prefixes = [
    ...TOOL_REGISTRY.map((t) => t.route),
    TOOL_CATALOG_ROUTE,
    TOOLS_SETTINGS_ROUTE,
  ];

  return prefixes.some(
    (prefix) => canonical === prefix || canonical.startsWith(`${prefix}/`),
  );
}

/**
 * @param {string} pathname
 * @returns {import('@/lib/tools/tool-surface').ToolSurface}
 */
export function surfaceFromPathname(pathname) {
  return isAdminSurfacePath(pathname) ? 'admin' : 'public';
}
