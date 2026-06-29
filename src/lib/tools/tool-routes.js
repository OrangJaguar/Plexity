import { TOOL_CATALOG_ROUTE, TOOL_REGISTRY } from '@/lib/tools/registry';

export const TOOLS_HOME = '/dashboard';
export const TOOLS_SETTINGS_ROUTE = '/settings';
export const PDF_ROUTE = '/pdf';

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
 * @param {string} pathname
 */
export function normalizeToolPathname(pathname) {
  return legacyToolsPathToCanonical(pathname || '/');
}

/** @param {import('@/lib/tools/registry').ToolId} id */
export function getToolRoute(id) {
  return TOOL_REGISTRY.find((t) => t.id === id)?.route ?? TOOLS_HOME;
}

/**
 * @param {...string} segments
 */
export function stocksRoute(...segments) {
  const path = segments.filter(Boolean).join('/');
  return path ? `/stocks/${path}` : '/stocks';
}

/**
 * @param {string} symbol
 * @param {{ tab?: string }} [opts]
 */
export function stocksSymbolRoute(symbol, { tab } = {}) {
  const base = `/stocks/symbol/${encodeURIComponent(symbol)}`;
  if (!tab) return base;
  return `${base}?tab=${encodeURIComponent(tab)}`;
}

/**
 * @param {string} pathname
 */
export function isToolsRoute(pathname) {
  if (!pathname || MARKETING_ROUTES.includes(pathname)) {
    return false;
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
