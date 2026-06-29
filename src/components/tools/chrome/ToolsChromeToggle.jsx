import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';

export default function ToolsChromeToggle() {
  const collapsed = useUiStore((s) => s.toolsChromeCollapsed);
  const setCollapsed = useUiStore((s) => s.setToolsChromeCollapsed);

  if (collapsed) {
    return (
      <button
        type="button"
        className="tools-chrome-toggle tools-chrome-toggle--expand"
        onClick={() => setCollapsed(false)}
        aria-label="Show navigation"
        title="Show navigation"
      >
        <ArrowUpRight size={10} strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="tools-chrome-toggle tools-chrome-toggle--collapse"
      onClick={() => setCollapsed(true)}
      aria-label="Expand tools to full screen"
      title="Expand to full screen"
    >
      <ArrowDownLeft size={10} strokeWidth={2.5} />
    </button>
  );
}
