import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';

export default function ToolsChromeToggle({ isMobile = false }) {
  const collapsed = useUiStore((s) => s.toolsChromeCollapsed);
  const setCollapsed = useUiStore((s) => s.setToolsChromeCollapsed);

  if (collapsed) {
    return (
      <button
        type="button"
        className="tools-chrome-toggle tools-chrome-toggle--expand"
        onClick={() => setCollapsed(false)}
        aria-label="Show navigation and footer"
        title="Show navigation"
      >
        <ArrowUpRight size={11} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`tools-chrome-toggle tools-chrome-toggle--collapse${isMobile ? ' tools-chrome-toggle--mobile' : ''}`}
      onClick={() => setCollapsed(true)}
      aria-label="Hide navigation for full screen"
      title="Full screen"
    >
      <ArrowDownLeft size={11} strokeWidth={2.5} />
    </button>
  );
}
