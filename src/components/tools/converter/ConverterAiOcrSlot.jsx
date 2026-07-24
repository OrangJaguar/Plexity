import { lazy, Suspense } from 'react';
import ToolCapability from '@/components/tools/shared/ToolCapability';
import { CONVERTER_AI_OCR_CAPABILITY } from '@/lib/tools/tool-capabilities';

const ConverterAiOcrPanel = lazy(() => import(
  '@/components/tools/converter/ConverterAiOcrPanel'
));

export default function ConverterAiOcrSlot() {
  return (
    <ToolCapability name={CONVERTER_AI_OCR_CAPABILITY}>
      <Suspense fallback={null}>
        <ConverterAiOcrPanel />
      </Suspense>
    </ToolCapability>
  );
}
