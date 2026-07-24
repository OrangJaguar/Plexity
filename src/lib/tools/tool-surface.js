/** @typedef {'public' | 'admin'} ToolSurface */

export const ADMIN_BASE_PATH = '/admin';
export const ADMIN_FEEDBACK_ROUTE = '/admin/feedback';
export const ADMIN_HOME = '/admin/dashboard';

/** Routes under /admin that are management pages, not mirrored tools. */
export const ADMIN_MANAGEMENT_ROUTES = [ADMIN_FEEDBACK_ROUTE];

/**
 * @param {ToolSurface} [surface]
 * @returns {string}
 */
export function basePathForSurface(surface = 'public') {
  return surface === 'admin' ? ADMIN_BASE_PATH : '';
}

/**
 * Strip the admin prefix for page-identity matching.
 * Management routes like /admin/feedback stay unchanged.
 * @param {string} pathname
 */
export function stripAdminPrefix(pathname = '') {
  const path = pathname || '/';
  if (ADMIN_MANAGEMENT_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))) {
    return path;
  }
  if (path === ADMIN_BASE_PATH || path === `${ADMIN_BASE_PATH}/`) {
    return '/';
  }
  if (path.startsWith(`${ADMIN_BASE_PATH}/`)) {
    return path.slice(ADMIN_BASE_PATH.length) || '/';
  }
  return path;
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
export function isAdminSurfacePath(pathname = '') {
  const path = pathname || '/';
  if (ADMIN_MANAGEMENT_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))) {
    return false;
  }
  return path === ADMIN_BASE_PATH || path.startsWith(`${ADMIN_BASE_PATH}/`);
}

/**
 * Prefix a canonical tool path with the current surface base path.
 * @param {string} canonicalPath e.g. /tasks or /stocks/watchlist
 * @param {{ basePath?: string, surface?: ToolSurface }} [opts]
 */
export function withSurfacePath(canonicalPath, opts = {}) {
  const basePath = opts.basePath ?? basePathForSurface(opts.surface);
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  if (!basePath) return path;
  if (path === '/') return basePath;
  return `${basePath}${path}`;
}
