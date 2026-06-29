import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import AppCheckbox from '@/components/shared/form/AppCheckbox';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDaysSummary(days = []) {
  if (!days.length) return 'No days';
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'Weekdays';
  return days.map((d) => DAY_LABELS[d]).join(', ');
}

export default function ScheduleDaysPicker({ days, onChange }) {
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

  const toggleDay = (day) => {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort();
    onChange(next);
  };

  return (
    <div ref={ref} className={`tools-schedule-days-picker${open ? ' open' : ''}`}>
      <button type="button" className="tools-schedule-days-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="tools-schedule-days-label">Days</span>
        <span className="tools-schedule-days-value">{formatDaysSummary(days)}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="tools-schedule-days-menu">
          {DAY_LABELS.map((label, day) => (
            <AppCheckbox
              key={label}
              className="tools-schedule-days-check"
              checked={days.includes(day)}
              onChange={() => toggleDay(day)}
            >
              {label}
            </AppCheckbox>
          ))}
        </div>
      )}
    </div>
  );
}
