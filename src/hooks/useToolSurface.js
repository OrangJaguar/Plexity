import { useContext } from 'react';
import { ToolSurfaceContext } from '@/providers/ToolSurfaceProvider';

/**
 * @returns {import('@/providers/ToolSurfaceProvider').ToolSurfaceValue}
 */
export function useToolSurface() {
  const ctx = useContext(ToolSurfaceContext);
  if (!ctx) {
    throw new Error('useToolSurface must be used within ToolSurfaceProvider');
  }
  return ctx;
}

/**
 * Soft lookup for components that may render outside tool surfaces (e.g. marketing).
 * Defaults to public.
 * @returns {import('@/providers/ToolSurfaceProvider').ToolSurfaceValue}
 */
export function useOptionalToolSurface() {
  const ctx = useContext(ToolSurfaceContext);
  return ctx ?? { surface: 'public', basePath: '', isAdminSurface: false };
}
