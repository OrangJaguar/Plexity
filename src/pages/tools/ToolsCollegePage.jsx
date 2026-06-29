import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import CollegeContent from '@/components/tools/college/CollegeContent';
import { useToolsCollege } from '@/hooks/queries/useToolsCollege';

export default function ToolsCollegePage() {
  const { data, saveDocument } = useToolsCollege();

  return (
    <ToolsPageShell className="tools-page--college">
      <CollegeContent data={data} saveDocument={saveDocument} />
    </ToolsPageShell>
  );
}
