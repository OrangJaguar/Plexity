import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import GoalsContent from '@/components/tools/goals/GoalsContent';
import { useToolsGoals } from '@/hooks/queries/useToolsGoals';
import VeridianLoading from '@/components/shared/VeridianLoading';

export default function ToolsGoalsPage() {
  const { data, isLoading, saveDocument } = useToolsGoals();

  if (isLoading) {
    return (
      <ToolsPageShell className="tools-page--goals">
        <VeridianLoading />
      </ToolsPageShell>
    );
  }

  return (
    <ToolsPageShell className="tools-page--goals">
      <GoalsContent data={data} saveDocument={saveDocument} />
    </ToolsPageShell>
  );
}
