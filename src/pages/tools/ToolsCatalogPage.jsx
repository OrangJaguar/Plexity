import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import ToolsCatalogContent from '@/components/tools/catalog/ToolsCatalogContent';

export default function ToolsCatalogPage() {
  return (
    <ToolsPageShell className="tools-page--catalog">
      <ToolsCatalogContent />
    </ToolsPageShell>
  );
}
