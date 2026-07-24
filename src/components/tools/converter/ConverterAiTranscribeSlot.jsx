import { lazy, Suspense } from 'react';
import ToolCapability from '@/components/tools/shared/ToolCapability';
import { CONVERTER_AI_TRANSCRIBE_CAPABILITY } from '@/lib/tools/tool-capabilities';

const ConverterAiTranscribePanel = lazy(() => import(
  '@/components/tools/converter/ConverterAiTranscribePanel'
));

export default function ConverterAiTranscribeSlot() {
  return (
    <ToolCapability name={CONVERTER_AI_TRANSCRIBE_CAPABILITY}>
      <Suspense fallback={null}>
        <ConverterAiTranscribePanel />
      </Suspense>
    </ToolCapability>
  );
}
