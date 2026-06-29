import { useEffect, useMemo, useState } from 'react';
import { filterCommands, isSlashPickerOpen } from '@/lib/tools/command-registry';

export default function SlashCommandMenu({
  input,
  pageId,
  visible,
  activeIndex,
  onSelect,
  onActiveIndexChange,
}) {
  const items = useMemo(() => filterCommands(input, pageId), [input, pageId]);

  useEffect(() => {
    if (activeIndex >= items.length) onActiveIndexChange(0);
  }, [items.length, activeIndex, onActiveIndexChange]);

  if (!visible || !isSlashPickerOpen(input) || items.length === 0) return null;

  return (
    <ul className="command-bar-slash-menu" role="listbox">
      {items.map((cmd, i) => (
        <li key={cmd.id}>
          <button
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            className={i === activeIndex ? 'is-active' : ''}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(cmd);
            }}
          >
            <span className="command-bar-slash-label">{cmd.label}</span>
            <span className="command-bar-slash-desc">{cmd.description}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function useSlashMenuState(input, pageId) {
  const [activeIndex, setActiveIndex] = useState(0);
  const visible = isSlashPickerOpen(input);
  const items = useMemo(() => filterCommands(input, pageId), [input, pageId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [input, pageId]);

  return { visible, items, activeIndex, setActiveIndex };
}
