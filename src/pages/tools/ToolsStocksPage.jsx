import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import StocksContent from '@/components/tools/stocks/StocksContent';

export default function ToolsStocksPage() {
  return (
    <ToolsPageShell className="tools-page--stocks">
      <StocksContent />
    </ToolsPageShell>
  );
}
