import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import ProfileContent from '@/components/tools/profile/ProfileContent';
import { useToolsProfile } from '@/hooks/queries/useToolsProfile';
import AppLoading from '@/components/shared/AppLoading';

export default function ToolsProfileToolPage() {
  const { data, isLoading, saveDocument } = useToolsProfile();

  if (isLoading) {
    return (
      <ToolsPageShell className="tools-page--profile-tool">
        <AppLoading />
      </ToolsPageShell>
    );
  }

  return (
    <ToolsPageShell className="tools-page--profile-tool">
      <ProfileContent data={data} saveDocument={saveDocument} />
    </ToolsPageShell>
  );
}
