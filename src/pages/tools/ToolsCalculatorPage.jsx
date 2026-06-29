import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import CalculatorContent from '@/components/tools/calculator/CalculatorContent';

export default function ToolsCalculatorPage() {
  return (
    <ToolsPageShell className="tools-page--calculator tools-page--immersive">
      <CalculatorContent />
    </ToolsPageShell>
  );
}
