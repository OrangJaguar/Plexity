import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function ToolsDropdown({
  label,
  valueLabel,
  children,
  align = 'right',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className={`tools-dropdown${open ? ' open' : ''}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="tools-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="tools-dropdown-label">{label}</span>
        <span className="tools-dropdown-value">{valueLabel}</span>
        <ChevronDown size={14} className="tools-dropdown-chevron" />
      </button>
      {open && (
        <div className={`tools-dropdown-menu tools-dropdown-menu--${align}`} onClick={(e) => e.stopPropagation()}>
          {typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      )}
    </div>
  );
}

export function ToolsDropdownOption({ active, onClick, children }) {
  return (
    <button type="button" className={`tools-dropdown-option${active ? ' active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

import AppCheckbox from '@/components/shared/form/AppCheckbox';

export function ToolsDropdownCheckOption({ checked, onChange, children }) {
  return (
    <AppCheckbox
      className="tools-dropdown-check-option"
      checked={checked}
      onChange={onChange}
    >
      {children}
    </AppCheckbox>
  );
}
