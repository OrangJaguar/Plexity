import { lazy, Suspense } from 'react';
import ToolCapability from '@/components/tools/shared/ToolCapability';
import { CONVERTER_AI_ASSIST_CAPABILITY } from '@/lib/tools/tool-capabilities';

const ConverterAiAssistPanel = lazy(() => import(
  '@/components/tools/converter/ConverterAiAssistPanel'
));

/**
 * Dynamically loads AI assist only when `converter.ai.assist` is present.
 */
export default function ConverterAiAssistSlot({
  onApplyLocalPlan,
  onApplyRemotePlan,
  canApplyRemote = false,
}) {
  return (
    <ToolCapability name={CONVERTER_AI_ASSIST_CAPABILITY}>
      <Suspense fallback={null}>
        <ConverterAiAssistPanel
          onApplyLocalPlan={onApplyLocalPlan}
          onApplyRemotePlan={onApplyRemotePlan}
          canApplyRemote={canApplyRemote}
        />
      </Suspense>
    </ToolCapability>
  );
}
