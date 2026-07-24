import { createContext, useMemo } from 'react';
import { resolveToolCapabilities } from '@/lib/tools/tool-capabilities';
import { useOptionalToolSurface } from '@/hooks/useToolSurface';

/**
 * @typedef {Object} ToolCapabilitiesValue
 * @property {string} toolId
 * @property {Readonly<Record<string, boolean>>} capabilities
 * @property {(key: string) => boolean} has
 * @property {Readonly<Record<string, unknown>>} slots
 */

export const ToolCapabilitiesContext = createContext(null);

/**
 * Presentation policy only — never put authorization callbacks or API clients here.
 * @param {{
 *   toolId: string,
 *   surface?: 'public' | 'admin',
 *   slots?: Record<string, unknown>,
 *   children: import('react').ReactNode,
 * }} props
 */
export default function ToolCapabilitiesProvider({
  toolId,
  surface: surfaceProp,
  slots = {},
  children,
}) {
  const surfaceCtx = useOptionalToolSurface();
  const surface = surfaceProp ?? surfaceCtx.surface;

  const value = useMemo(() => {
    const capabilities = resolveToolCapabilities(toolId, surface);
    return {
      toolId,
      capabilities,
      has: (key) => capabilities[key] === true,
      slots: Object.freeze({ ...slots }),
    };
  }, [toolId, surface, slots]);

  return (
    <ToolCapabilitiesContext.Provider value={value}>
      {children}
    </ToolCapabilitiesContext.Provider>
  );
}
