import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import PasswordsContent from '@/components/tools/passwords/PasswordsContent';

export default function ToolsPasswordsPage() {
  return (
    <ToolsPageShell className="tools-page--passwords">
      <div className="passwords-tools-shell">
        <PasswordsContent />
      </div>
    </ToolsPageShell>
  );
}
