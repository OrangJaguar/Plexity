import { lazy, Suspense } from 'react';
import ToolCapability from '@/components/tools/shared/ToolCapability';
import { CONVERTER_PLAYLIST_IMPORT_CAPABILITY } from '@/lib/tools/tool-capabilities';

const ConverterPlaylistDiscoveryPanel = lazy(() => import(
  '@/components/tools/converter/ConverterPlaylistDiscoveryPanel'
));

/**
 * Dynamically loads playlist discovery only when capability is present.
 */
export default function ConverterPlaylistDiscoverySlot() {
  return (
    <ToolCapability name={CONVERTER_PLAYLIST_IMPORT_CAPABILITY}>
      <Suspense fallback={null}>
        <ConverterPlaylistDiscoveryPanel />
      </Suspense>
    </ToolCapability>
  );
}
