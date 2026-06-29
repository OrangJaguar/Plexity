import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import PdfToolsContent from '@/components/tools/pdftools/PdfToolsContent';

export default function ToolsPdfToolsPage() {
  return (
    <ToolsPageShell className="tools-page--pdf">
      <PdfToolsContent />
    </ToolsPageShell>
  );
}
