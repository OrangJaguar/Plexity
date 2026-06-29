import CalculatorSuite from '@/components/tools/calculator/CalculatorSuite';
import { useToolsCalculator } from '@/hooks/queries/useToolsCalculator';

export default function CalculatorContent() {
  const { data, saveDocument, isLoading } = useToolsCalculator();

  if (isLoading) {
    return <div className="calc-loading">Loading calculator…</div>;
  }

  return (
    <div className="calculator-suite-shell">
      <CalculatorSuite data={data} saveDocument={saveDocument} />
    </div>
  );
}
