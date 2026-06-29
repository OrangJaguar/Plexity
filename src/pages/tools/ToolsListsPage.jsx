import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import ListsContent from '@/components/tools/lists/ListsContent';
import { useToolsLists } from '@/hooks/queries/useToolsLists';
import VeridianLoading from '@/components/shared/VeridianLoading';

export default function ToolsListsPage() {
  const { data, isLoading, saveDocument } = useToolsLists();

  if (isLoading) {
    return (
      <ToolsPageShell className="tools-page--lists">
        <VeridianLoading />
      </ToolsPageShell>
    );
  }

  return (
    <ToolsPageShell className="tools-page--lists">
      <ListsContent data={data} saveDocument={saveDocument} />
    </ToolsPageShell>
  );
}
