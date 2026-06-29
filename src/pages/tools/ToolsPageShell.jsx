import AppLoading from '@/components/shared/AppLoading';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';

export default function ToolsPageShell({ children, className = '' }) {
  const { isLoading } = useAuth();
  const toolsChromeCollapsed = useUiStore((s) => s.toolsChromeCollapsed);

  if (isLoading) {
    return <AppLoading fullPage />;
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
