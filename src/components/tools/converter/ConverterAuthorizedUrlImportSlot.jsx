import { lazy, Suspense } from 'react';
import ToolCapability from '@/components/tools/shared/ToolCapability';
import { CONVERTER_URL_IMPORT_CAPABILITY } from '@/lib/tools/tool-capabilities';

const ConverterAuthorizedUrlImport = lazy(() => import(
  '@/components/tools/converter/ConverterAuthorizedUrlImport'
));

/**
 * Dynamically loads Authorized URL Import only when the capability is present.
 * Public bundles never statically include the admin URL import module graph
 * beyond this lazy boundary (capability false → children not rendered).
 */
export default function ConverterAuthorizedUrlImportSlot({ defaultPlan = null }) {
  return (
    <ToolCapability name={CONVERTER_URL_IMPORT_CAPABILITY}>
      <Suspense fallback={null}>
        <ConverterAuthorizedUrlImport defaultPlan={defaultPlan} />
      </Suspense>
    </ToolCapability>
  );
}
