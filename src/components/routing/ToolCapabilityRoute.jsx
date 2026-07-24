import { Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ToolCapabilitiesProvider from '@/providers/ToolCapabilitiesProvider';
import { useOptionalToolSurface } from '@/hooks/useToolSurface';
import { resolveToolCapabilities } from '@/lib/tools/tool-capabilities';

const ConverterAuthorizedUrlImport = lazy(() => import(
  '@/components/tools/converter/ConverterAuthorizedUrlImport'
));
const ConverterPlaylistDiscoveryPanel = lazy(() => import(
  '@/components/tools/converter/ConverterPlaylistDiscoveryPanel'
));

/**
 * Wraps a tool route with capability context.
 * Admin converter injects dynamically loaded inputSources (URL import + playlist).
 * AI panels are slotted from ConverterContent so apply callbacks stay local.
 * @param {{ toolId: string, children?: import('react').ReactNode }} props
 */
export default function ToolCapabilityRoute({ toolId, children }) {
  const { surface } = useOptionalToolSurface();
  const caps = resolveToolCapabilities(toolId, surface);

  /** @type {Record<string, unknown>} */
  const slots = {};
  if (toolId === 'converter' && caps['converter.url.import'] === true) {
    slots.inputSources = (
      <Suspense fallback={null}>
        <ConverterAuthorizedUrlImport />
        {caps['converter.playlist.import'] === true ? (
          <ConverterPlaylistDiscoveryPanel />
        ) : null}
      </Suspense>
    );
  }

  return (
    <ToolCapabilitiesProvider toolId={toolId} slots={slots}>
      {children ?? <Outlet />}
    </ToolCapabilitiesProvider>
  );
}
