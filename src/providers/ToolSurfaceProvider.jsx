import { createContext, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { basePathForSurface } from '@/lib/tools/tool-surface';

/** @typedef {'public' | 'admin'} ToolSurface */

/**
 * @typedef {Object} ToolSurfaceValue
 * @property {ToolSurface} surface
 * @property {string} basePath '' | '/admin'
 * @property {boolean} isAdminSurface
 */

export const ToolSurfaceContext = createContext(null);

/**
 * Routing/presentation context only — does not grant authorization.
 * When used as a React Router layout `element`, renders <Outlet />.
 * @param {{ surface?: ToolSurface, children?: import('react').ReactNode }} props
 */
export default function ToolSurfaceProvider({ surface = 'public', children }) {
  const value = useMemo(() => {
    const resolved = surface === 'admin' ? 'admin' : 'public';
    return {
      surface: resolved,
      basePath: basePathForSurface(resolved),
      isAdminSurface: resolved === 'admin',
    };
  }, [surface]);

  return (
    <ToolSurfaceContext.Provider value={value}>
      {children ?? <Outlet />}
    </ToolSurfaceContext.Provider>
  );
}
