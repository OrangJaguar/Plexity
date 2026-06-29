import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import ToolsSettingsContent from '@/components/tools/settings/ToolsSettingsContent';

export default function ToolsSettingsPage() {
  return (
    <ToolsPageShell className="tools-page--settings">
      <ToolsSettingsContent />
    </ToolsPageShell>
  );
}
