import LoginPrompt from '@/components/stubs/LoginPrompt';
import VeridianLoading from '@/components/shared/VeridianLoading';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';

export default function ToolsPageShell({ children, className = '' }) {
  const { isAuthenticated, isLoading } = useAuth();
  const toolsChromeCollapsed = useUiStore((s) => s.toolsChromeCollapsed);

  if (isLoading) {
    return <VeridianLoading fullPage />;
  }

  if (!isAuthenticated) {
    return <LoginPrompt action="use productivity tools" />;
  }

  const pageClass = [
    'tools-page',
    className,
    toolsChromeCollapsed ? 'tools-page--immersive' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={pageClass}>
      {children}
    </div>
  );
}
