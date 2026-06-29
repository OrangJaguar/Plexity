import { useEffect, useMemo, useState } from 'react';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import { toLocalDateKey } from '@/lib/tools/date';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildMonthGridCells(year, month) {
  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - first.getDay());
  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export default function ToolsMonthViewDialog({
  open,
  onOpenChange,
  anchor = new Date(),
  todayKey,
  onSelectDay,
  getDayMeta,
  disableFuture = false,
}) {
  const [cursor, setCursor] = useState(() => new Date(anchor));

  useEffect(() => {
    if (open) setCursor(new Date(anchor));
  }, [open, anchor]);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const cells = useMemo(() => buildMonthGridCells(y, m), [y, m]);

  const yearOptions = useMemo(() => {
    const base = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => base - 5 + i);
  }, []);

  const handleSelect = (day) => {
    const key = toLocalDateKey(day);
    if (disableFuture && todayKey && key > todayKey) return;
    onSelectDay?.(day, key);
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title="Month View" maxWidth="720px" className="tools-month-modal">
      <div className="tools-month-toolbar">
        <div className="tools-month-toolbar-left">
          <button
            type="button"
            className="tools-month-nav-btn"
            onClick={() => setCursor(new Date(y, m - 1, 1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="tools-month-nav-btn"
            onClick={() => setCursor(new Date(y, m + 1, 1))}
            aria-label="Next month"
          >
            ›
          </button>
          <span className="tools-month-toolbar-label">
            {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="tools-month-toolbar-right">
          <select
            className="tools-month-select"
            value={m}
            onChange={(e) => setCursor(new Date(y, Number(e.target.value), 1))}
            aria-label="Month"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>{name}</option>
            ))}
          </select>
          <select
            className="tools-month-select"
            value={y}
            onChange={(e) => setCursor(new Date(Number(e.target.value), m, 1))}
            aria-label="Year"
          >
            {yearOptions.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="tools-calendar-month-head">
        {DAY_LABELS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="tools-calendar-month-grid tools-calendar-month-grid--fixed">
        {cells.map((day) => {
          const key = toLocalDateKey(day);
          const inMonth = day.getMonth() === m;
          const meta = getDayMeta?.(day, key) || {};
          const isToday = todayKey ? key === todayKey : key === toLocalDateKey(new Date());
          const isFuture = disableFuture && todayKey && key > todayKey;
          const classes = [
            'tools-calendar-month-cell',
            !inMonth ? ' other-month' : '',
            meta.hasEntry ? ' has-entry' : '',
            isToday ? ' is-today' : '',
            isFuture ? ' is-future' : '',
            meta.extraClass || '',
          ].join('');

          return (
            <button
              key={key}
              type="button"
              className={classes}
              onClick={() => handleSelect(day)}
              disabled={isFuture}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </ToolsModal>
  );
}
