import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import ListsContent from '@/components/tools/lists/ListsContent';
import { useToolsLists } from '@/hooks/queries/useToolsLists';
import AppLoading from '@/components/shared/AppLoading';

export default function ToolsListsPage() {
  const { data, isLoading, saveDocument } = useToolsLists();

  if (isLoading) {
    return (
      <ToolsPageShell className="tools-page--lists">
        <AppLoading />
      </ToolsPageShell>
    );
  }

  return (
    <ToolsPageShell className="tools-page--lists">
      <ListsContent data={data} saveDocument={saveDocument} />
    </ToolsPageShell>
  );
}
