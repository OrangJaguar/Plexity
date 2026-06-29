import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ToolsModal from '@/components/tools/shared/ToolsModal';
import ToolsMonthViewDialog from '@/components/tools/shared/ToolsMonthViewDialog';
import VeridianCheckbox from '@/components/shared/form/VeridianCheckbox';
import {
  getCalendarEventsForWeek,
  getCalendarEventsForDay,
  getTopFromMinutes,
  getMinutesSinceCalendarStart,
  clampCalendarMinutes,
  softSnapCalendarMinute,
  formatCalendarEventTime,
  formatWeekRangeLabel,
  getWeekDays,
  toLocalDateKey,
  addDays,
  minutesToLabel,
  truncateNotes,
  isRepeatingEvent,
  patchEventThisInstance,
  patchEventAllFuture,
} from '@/lib/tools/calendar-repeat';
import {
  computeDayOverlapLayout,
  getOverlapInlineStyle,
  getOverlapLayoutKey,
} from '@/lib/tools/calendar-overlap';
import { toDateTimeLocalKey } from '@/lib/tools/date';
import { CALENDAR_COLOR_SWATCHES, DEFAULT_EVENT_COLOR } from '@/lib/tools/constants';
import { useCommandBarDraft } from '@/hooks/useCommandBarDraft';
import { eventFormToTaskDraft } from '@/lib/tools/command-bar-draft';

const RESIZE_EDGE_PX = 7;

function getEventInteractionMode(relY, height) {
  if (relY <= RESIZE_EDGE_PX) return 'resize-start';
  if (relY >= height - RESIZE_EDGE_PX) return 'resize-end';
  if (relY <= height / 3) return 'move';
  if (relY >= (height * 2) / 3) return 'edit';
  return 'move';
}

function SeriesScopeDialog({ open, onOpenChange, action, onChoose }) {
  const verb = action === 'delete' ? 'Delete' : 'Move';
  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title={`${verb} Repeating Event`} maxWidth="420px">
      <p className="tools-calendar-series-prompt">
        This event repeats. {verb} just this occurrence or this and all future occurrences?
      </p>
      <div className="tools-form-actions">
        <span />
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
          <button type="button" className="btn" onClick={() => onChoose('instance')}>This instance</button>
          <button type="button" className="btn btn-primary" onClick={() => onChoose('future')}>All future</button>
        </div>
      </div>
    </ToolsModal>
  );
}

function CalendarEventDialog({ open, onOpenChange, event, initial, onSave, onDelete, onSwitchToTask }) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState(DEFAULT_EVENT_COLOR);
  const [repeatRule, setRepeatRule] = useState('none');
  const [repeatIntervalWeeks, setRepeatIntervalWeeks] = useState(1);
  const [repeatDays, setRepeatDays] = useState([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) return;
    const e = event || initial || {};
    setTitle(e.title || '');
    setStart(e.start ? e.start.slice(0, 16) : '');
    setEnd(e.end ? e.end.slice(0, 16) : '');
    setAllDay(!!e.allDay);
    setColor(e.color || DEFAULT_EVENT_COLOR);
    setRepeatRule(e.repeatRule || 'none');
    setRepeatIntervalWeeks(Math.max(1, Number(e.repeatIntervalWeeks) || 1));
    setRepeatDays(e.repeatDays || []);
    setNotes(e.notes || '');
  }, [open, event, initial]);

  const toggleDay = (dow) => {
    setRepeatDays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      title,
      start,
      end,
      allDay,
      color,
      repeatRule,
      repeatIntervalWeeks: repeatRule === 'interval' ? repeatIntervalWeeks : undefined,
      repeatDays,
      linkedJourneyIds: event?.linkedJourneyIds ?? [],
      notes,
    });
    onOpenChange(false);
  };

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title={event ? 'Edit Calendar Event' : 'Add Calendar Event'} maxWidth="520px">
      <form onSubmit={handleSubmit}>
        <div className="tools-modal-field">
          <label htmlFor="cal-title">Title</label>
          <input id="cal-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="tools-calendar-all-day-row">
          <VeridianCheckbox
            className="settings-veridian-check"
            id="cal-all-day"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          >
            All day
          </VeridianCheckbox>
        </div>
        {!allDay && (
          <div className="tools-calendar-modal-grid">
            <div className="tools-modal-field">
              <label htmlFor="cal-start">Start</label>
              <input id="cal-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="tools-modal-field">
              <label htmlFor="cal-end">End</label>
              <input id="cal-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
        )}
        <div className="tools-calendar-modal-grid">
          <div className="tools-modal-field">
            <label>Color</label>
            <div className="tools-calendar-color-row">
              {CALENDAR_COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`tools-calendar-color-swatch${color === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} title="Custom color" />
            </div>
          </div>
          <div className="tools-modal-field">
            <label htmlFor="cal-repeat">Repeat</label>
            <select id="cal-repeat" value={repeatRule} onChange={(e) => setRepeatRule(e.target.value)}>
              <option value="none">Does not repeat</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="weekdays">Weekdays</option>
              <option value="interval">Every X weeks</option>
              <option value="custom">Custom days</option>
            </select>
            {repeatRule === 'interval' && (
              <div className="tools-calendar-interval-row">
                <label htmlFor="cal-interval">Every</label>
                <input
                  id="cal-interval"
                  type="number"
                  min={1}
                  max={52}
                  value={repeatIntervalWeeks}
                  onChange={(e) => setRepeatIntervalWeeks(Math.max(1, Number(e.target.value) || 1))}
                />
                <span>week(s)</span>
              </div>
            )}
            {(repeatRule === 'custom' || repeatRule === 'interval') && (
              <div className="tools-calendar-repeat-days">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, dow) => (
                  <button
                    key={dow}
                    type="button"
                    className={`tools-calendar-repeat-day-chip${repeatDays.includes(dow) ? ' active' : ''}`}
                    onClick={() => toggleDay(dow)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="tools-modal-field">
          <label htmlFor="cal-notes">Notes</label>
          <textarea id="cal-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="tools-form-actions">
          {event ? (
            <button type="button" className="btn btn-danger" onClick={onDelete}>Delete</button>
          ) : onSwitchToTask ? (
            <button
              type="button"
              className="tools-modal-switch-type"
              onClick={() => onSwitchToTask({ title, start, end })}
            >
              Switch to task
            </button>
          ) : <span />}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </div>
      </form>
    </ToolsModal>
  );
}

function DayViewDialog({ open, onOpenChange, day, events }) {
  const dayEvents = day ? getCalendarEventsForDay(day, events) : [];
  const title = day
    ? day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Day View';

  return (
    <ToolsModal open={open} onOpenChange={onOpenChange} title={title} maxWidth="920px">
      <div className="tools-calendar-day-modal-shell">
        {dayEvents.length === 0 ? (
          <div className="tools-empty-hint">No events this day.</div>
        ) : (
          dayEvents.map((evt) => (
            <div key={`${evt.eventId}-${evt.instanceDateKey}`} className="tools-debrief-item">
              <div>{evt.title}</div>
              <div className="meta">{formatCalendarEventTime(evt)}</div>
              {evt.notes ? <div className="meta">{evt.notes}</div> : null}
            </div>
          ))
        )}
      </div>
    </ToolsModal>
  );
}

export default function CalendarContent({ events, createEvent, updateEvent, deleteEvent }) {
  const navigate = useNavigate();
  const { draft: commandDraft, clearDraft } = useCommandBarDraft('event');
  const [anchor, setAnchor] = useState(() => new Date());
  const [now, setNow] = useState(() => new Date());
  const [eventOpen, setEventOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [initial, setInitial] = useState(null);
  const [dayOpen, setDayOpen] = useState(false);
  const [dayView, setDayView] = useState(null);
  const [monthOpen, setMonthOpen] = useState(false);
  const [dragGhost, setDragGhost] = useState(null);
  const [seriesPrompt, setSeriesPrompt] = useState(null);
  const scrollWrapRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (commandDraft) {
      setEditing(null);
      setInitial(commandDraft);
      setEventOpen(true);
    }
  }, [commandDraft]);

  const handleSwitchToTask = ({ title, start }) => {
    setEventOpen(false);
    clearDraft();
    setInitial(null);
    navigate('/tools/tasks', {
      state: { commandBar: { type: 'task', draft: eventFormToTaskDraft({ title, start }) } },
    });
  };

  useEffect(() => {
    const el = scrollWrapRef.current;
    if (!el) return;
    const nowMin = getMinutesSinceCalendarStart(new Date());
    const topPx = getTopFromMinutes(nowMin);
    el.scrollTop = Math.max(0, topPx - el.clientHeight / 2);
  }, []);

  const weekDays = getWeekDays(anchor);
  const eventsByDay = getCalendarEventsForWeek(anchor, events);
  const todayKey = toLocalDateKey(new Date());

  const getCalendarDayMeta = useCallback((day) => {
    const dayEvents = getCalendarEventsForDay(day, events);
    return { hasEntry: dayEvents.length > 0 };
  }, [events]);

  const openCreate = (start, end) => {
    setEditing(null);
    setInitial({ start: toDateTimeLocalKey(start), end: toDateTimeLocalKey(end) });
    setEventOpen(true);
  };

  const getCalendarMinuteFromPointer = (laneEl, clientY) => {
    const rect = laneEl.getBoundingClientRect();
    return clampCalendarMinutes(Math.round((clientY - rect.top) / (56 / 60)));
  };

  const handleLaneMouseDown = (e, day) => {
    if (e.button !== 0) return;
    const lane = e.currentTarget;
    const startMin = softSnapCalendarMinute(getCalendarMinuteFromPointer(lane, e.clientY));
    const dayKey = toLocalDateKey(day);

    const onMove = (ev) => {
      const endMin = softSnapCalendarMinute(getCalendarMinuteFromPointer(lane, ev.clientY));
      const sMin = Math.min(startMin, endMin);
      const eMin = Math.max(Math.max(endMin, startMin + 5), sMin + 5);
      dragRef.current = { startMin: sMin, endMin: eMin, day, dayKey };
      setDragGhost({ startMin: sMin, endMin: eMin, dayKey });
    };

    const onUp = (ev) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setDragGhost(null);
      const endMin = softSnapCalendarMinute(getCalendarMinuteFromPointer(lane, ev.clientY));
      const sMin = Math.min(startMin, endMin);
      const eMin = Math.max(Math.max(endMin, sMin + 5), sMin + 5);
      dragRef.current = null;
      const s = new Date(day);
      s.setHours(0, 0, 0, 0);
      s.setMinutes(sMin + 60);
      const en = new Date(day);
      en.setHours(0, 0, 0, 0);
      en.setMinutes(eMin + 60);
      openCreate(s, en);
    };

    dragRef.current = { startMin, endMin: startMin + 5, day, dayKey };
    setDragGhost({ startMin, endMin: startMin + 5, dayKey });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const requestSeriesAction = (action, evt, patch) => {
    if (!isRepeatingEvent(evt)) {
      if (action === 'delete') return deleteEvent(evt.eventId);
      return updateEvent(evt.eventId, patch);
    }
    setSeriesPrompt({ action, evt, patch });
  };

  const handleSeriesChoice = async (scope) => {
    if (!seriesPrompt) return;
    const { action, evt, patch } = seriesPrompt;
    setSeriesPrompt(null);
    const dateKey = evt.instanceDateKey || toLocalDateKey(evt.displayStart);
    if (action === 'delete') {
      if (scope === 'instance') {
        await updateEvent(evt.eventId, patchEventThisInstance(evt, dateKey, { cancelled: true }));
      } else {
        const { truncatePatch } = patchEventAllFuture(evt, dateKey, { cancelled: true });
        await updateEvent(evt.eventId, truncatePatch);
      }
      return;
    }
    if (scope === 'instance') {
      await updateEvent(evt.eventId, patchEventThisInstance(evt, dateKey, patch));
      return;
    }
    const { truncatePatch, newEventPayload } = patchEventAllFuture(evt, dateKey, patch);
    await updateEvent(evt.eventId, truncatePatch);
    if (newEventPayload) await createEvent(newEventPayload);
  };

  const handleEventMouseDown = (e, evt, day) => {
    e.stopPropagation();
    const block = e.currentTarget;
    const rect = block.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const h = rect.height;
    const mode = getEventInteractionMode(relY, h);
    if (mode === 'edit') return;

    const origStart = new Date(evt.displayStart);
    const origEnd = new Date(evt.displayEnd);
    const origTop = parseFloat(block.style.top) || getTopFromMinutes(getMinutesSinceCalendarStart(origStart));
    const origHeight = parseFloat(block.style.height) || Math.max(getTopFromMinutes(getMinutesSinceCalendarStart(origEnd)) - origTop, 20);

    block.classList.add(
      mode === 'move' ? 'is-moving' : mode === 'resize-start' ? 'is-resize-start' : 'is-resize-end',
    );

    const onMove = (ev) => {
      const lane = block.parentElement;
      const min = softSnapCalendarMinute(getCalendarMinuteFromPointer(lane, ev.clientY));
      const d = new Date(day);
      d.setHours(0, 0, 0, 0);
      d.setMinutes(min + 60);
      if (mode === 'move') {
        const dur = origEnd - origStart;
        block.style.top = `${getTopFromMinutes(min)}px`;
        block.dataset.pendingStart = toDateTimeLocalKey(d);
        block.dataset.pendingEnd = toDateTimeLocalKey(new Date(d.getTime() + dur));
      } else if (mode === 'resize-start') {
        const endMin = getMinutesSinceCalendarStart(origEnd);
        const nextMin = Math.min(min, endMin - 5);
        block.style.top = `${getTopFromMinutes(nextMin)}px`;
        block.style.height = `${Math.max(getTopFromMinutes(endMin) - getTopFromMinutes(nextMin), 20)}px`;
        d.setMinutes(nextMin + 60);
        block.dataset.pendingStart = toDateTimeLocalKey(d);
      } else {
        const startMin = getMinutesSinceCalendarStart(origStart);
        const nextMin = Math.max(min, startMin + 5);
        block.style.height = `${Math.max(getTopFromMinutes(nextMin) - origTop, 20)}px`;
        d.setMinutes(nextMin + 60);
        block.dataset.pendingEnd = toDateTimeLocalKey(d);
      }
    };

    const onUp = async () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      block.classList.remove('is-moving', 'is-resize-start', 'is-resize-end');
      const ps = block.dataset.pendingStart;
      const pe = block.dataset.pendingEnd;
      delete block.dataset.pendingStart;
      delete block.dataset.pendingEnd;
      if (!ps && !pe) return;
      const patch = {
        start: ps || evt.start,
        end: pe || evt.end,
      };
      requestSeriesAction('move', evt, patch);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleSave = async (data) => {
    if (editing) {
      await updateEvent(editing.eventId, data);
    } else {
      await createEvent(data);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    requestSeriesAction('delete', editing, {});
    setEventOpen(false);
    setEditing(null);
  };

  return (
    <div className="tools-calendar-shell">
      <div className="tools-calendar-head">
        <button type="button" className="tools-calendar-nav-btn" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week">‹</button>
        <button type="button" className="tools-calendar-nav-btn" onClick={() => setAnchor(addDays(anchor, 7))} aria-label="Next week">›</button>
        <button type="button" className="btn btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
        <div className="tools-calendar-range-label">{formatWeekRangeLabel(anchor)}</div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setMonthOpen(true)}>Month View</button>
      </div>
      <div className="tools-calendar-week-grid-wrap" ref={scrollWrapRef}>
        <div className="tools-calendar-week-grid">
          <div className="tools-calendar-time-corner" />
          {weekDays.map((day, idx) => (
            <button
              key={idx}
              type="button"
              className="tools-calendar-day-head"
              style={{ gridColumn: idx + 2, gridRow: 1 }}
              onClick={() => { setDayView(day); setDayOpen(true); }}
            >
              <span>{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="tools-calendar-day-num">{day.getDate()}</span>
            </button>
          ))}
          <div className="tools-calendar-time-col" style={{ gridColumn: 1, gridRow: 2 }}>
            {Array.from({ length: 24 }, (_, i) => {
              const h = i + 1;
              const hour = h === 24 ? 0 : h;
              const dt = new Date();
              dt.setHours(hour, 0, 0, 0);
              return (
                <div key={i} className="tools-calendar-time-label">
                  {dt.toLocaleTimeString('en-US', { hour: 'numeric' })}
                </div>
              );
            })}
          </div>
          {weekDays.map((day, idx) => {
            const key = toLocalDateKey(day);
            const dayEvents = eventsByDay[key] || [];
            const overlapLayout = computeDayOverlapLayout(dayEvents);
            const isToday = key === todayKey;
            const nowMin = isToday ? getMinutesSinceCalendarStart(now) : null;
            const ghost = dragGhost?.dayKey === key ? dragGhost : null;
            return (
              <div
                key={key}
                className="tools-calendar-day-lane"
                style={{ gridColumn: idx + 2, gridRow: 2 }}
                onMouseDown={(e) => {
                  if (e.target.classList.contains('tools-calendar-day-lane')) {
                    handleLaneMouseDown(e, day);
                  }
                }}
              >
                {isToday && nowMin != null && nowMin >= 0 && nowMin <= 23 * 60 && (
                  <div className="tools-calendar-now-line" style={{ top: `${getTopFromMinutes(nowMin)}px` }}>
                    <span className="tools-calendar-now-dot" />
                  </div>
                )}
                {ghost && (
                  <div
                    className="tools-calendar-event tools-calendar-event-ghost"
                    style={{
                      top: `${getTopFromMinutes(ghost.startMin)}px`,
                      height: `${Math.max(getTopFromMinutes(ghost.endMin) - getTopFromMinutes(ghost.startMin), 20)}px`,
                    }}
                  >
                    <span className="tools-calendar-event-time">
                      {minutesToLabel(ghost.startMin)} – {minutesToLabel(ghost.endMin)}
                    </span>
                  </div>
                )}
                {dayEvents.map((evt) => {
                  const isAllDay = evt.allDay;
                  const top = isAllDay
                    ? 0
                    : getTopFromMinutes(getMinutesSinceCalendarStart(evt.displayStart));
                  const height = isAllDay
                    ? 22
                    : Math.max(
                      getTopFromMinutes(getMinutesSinceCalendarStart(evt.displayEnd)) - top,
                      20,
                    );
                  const layout = overlapLayout.get(getOverlapLayoutKey(evt));
                  const overlapStyle = layout ? getOverlapInlineStyle(layout) : {};
                  const notesPreview = truncateNotes(evt.notes);
                  const tooltip = [evt.title, formatCalendarEventTime(evt), evt.notes].filter(Boolean).join('\n');
                  return (
                    <button
                      key={`${evt.eventId}-${key}`}
                      type="button"
                      className="tools-calendar-event"
                      title={tooltip}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        background: `${evt.color}55`,
                        borderColor: evt.color,
                        ...overlapStyle,
                      }}
                      onMouseDown={(e) => {
                        const relY = e.clientY - e.currentTarget.getBoundingClientRect().top;
                        const blockH = e.currentTarget.getBoundingClientRect().height;
                        const mode = getEventInteractionMode(relY, blockH);
                        if (mode === 'edit') {
                          e.stopPropagation();
                          setEditing(evt);
                          setInitial(null);
                          setEventOpen(true);
                          return;
                        }
                        handleEventMouseDown(e, evt, day);
                      }}
                    >
                      <span className="tools-calendar-event-title">{evt.title}</span>
                      <span className="tools-calendar-event-time">{formatCalendarEventTime(evt)}</span>
                      {notesPreview ? (
                        <span className="tools-calendar-event-notes">{notesPreview}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <CalendarEventDialog
        open={eventOpen}
        onOpenChange={(next) => {
          setEventOpen(next);
          if (!next) {
            clearDraft();
            if (!editing) setInitial(null);
          }
        }}
        event={editing}
        initial={initial}
        onSave={handleSave}
        onDelete={handleDelete}
        onSwitchToTask={!editing ? handleSwitchToTask : undefined}
      />
      <DayViewDialog open={dayOpen} onOpenChange={setDayOpen} day={dayView} events={events} />
      <ToolsMonthViewDialog
        open={monthOpen}
        onOpenChange={setMonthOpen}
        anchor={anchor}
        todayKey={todayKey}
        onSelectDay={(day) => setAnchor(day)}
        getDayMeta={getCalendarDayMeta}
      />
      <SeriesScopeDialog
        open={!!seriesPrompt}
        onOpenChange={(open) => { if (!open) setSeriesPrompt(null); }}
        action={seriesPrompt?.action}
        onChoose={handleSeriesChoice}
      />
    </div>
  );
}
