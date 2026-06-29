import { toLocalDateKey, parseLocalDateKey, addDays, getWeekDays } from './date';
import { DEFAULT_EVENT_COLOR } from './constants';

export function normalizeCalendarEvent(raw) {
  return {
    ...raw,
    eventId: raw.eventId || raw.id,
    title: raw.title || 'Untitled',
    start: raw.start || new Date().toISOString(),
    end: raw.end || new Date().toISOString(),
    allDay: !!raw.allDay,
    color: raw.color || DEFAULT_EVENT_COLOR,
    repeatRule: raw.repeatRule || 'none',
    repeatIntervalWeeks: Math.max(1, Number(raw.repeatIntervalWeeks) || 1),
    repeatDays: Array.isArray(raw.repeatDays) ? raw.repeatDays.map(Number).filter((v) => v >= 0 && v <= 6) : [],
    linkedJourneyIds: Array.isArray(raw.linkedJourneyIds) ? raw.linkedJourneyIds.filter(Boolean) : [],
    instanceOverrides: Array.isArray(raw.instanceOverrides) ? raw.instanceOverrides : [],
    repeatUntil: raw.repeatUntil || null,
    notes: raw.notes || '',
  };
}

export function getInstanceOverride(evt, dateKey) {
  return (evt.instanceOverrides || []).find((o) => o.dateKey === dateKey) || null;
}

export function isRepeatingEvent(evt) {
  return !!evt.repeatRule && evt.repeatRule !== 'none';
}

export function upsertInstanceOverride(overrides, dateKey, patch) {
  const list = [...(overrides || [])];
  const idx = list.findIndex((o) => o.dateKey === dateKey);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, dateKey };
  } else {
    list.push({ dateKey, ...patch });
  }
  return list;
}

export function patchEventThisInstance(evt, dateKey, patch) {
  const { start, end, cancelled } = patch;
  return {
    instanceOverrides: upsertInstanceOverride(evt.instanceOverrides, dateKey, {
      ...(start != null ? { start } : {}),
      ...(end != null ? { end } : {}),
      ...(cancelled != null ? { cancelled } : {}),
    }),
  };
}

export function patchEventAllFuture(evt, dateKey, patch) {
  const prevDay = addDays(parseLocalDateKey(dateKey), -1);
  const repeatUntil = toLocalDateKey(prevDay);

  if (patch.cancelled) {
    return { truncatePatch: { repeatUntil } };
  }

  return {
    truncatePatch: { repeatUntil },
    newEventPayload: {
      title: evt.title,
      start: patch.start,
      end: patch.end,
      allDay: evt.allDay,
      color: evt.color,
      repeatRule: evt.repeatRule,
      repeatIntervalWeeks: evt.repeatIntervalWeeks,
      repeatDays: evt.repeatDays,
      linkedJourneyIds: evt.linkedJourneyIds,
      notes: evt.notes,
    },
  };
}

function daysBetween(startDate, endDate) {
  const a = new Date(startDate);
  a.setHours(0, 0, 0, 0);
  const b = new Date(endDate);
  b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function doesEventOccurOnDay(evt, dayDate) {
  const start = new Date(evt.start);
  const end = new Date(evt.end);
  const dayKey = toLocalDateKey(dayDate);
  const override = getInstanceOverride(evt, dayKey);
  if (override?.cancelled) return false;

  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(23, 59, 59, 999);

  if (evt.repeatUntil && dayKey > evt.repeatUntil) return false;

  if (evt.repeatRule === 'none') {
    return start <= dayEnd && end >= dayStart;
  }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  if (dayStart < startDay) return false;

  if (evt.repeatRule === 'daily') return true;

  if (evt.repeatRule === 'weekly') {
    return dayDate.getDay() === start.getDay();
  }

  if (evt.repeatRule === 'weekdays') {
    const dow = dayDate.getDay();
    return dow >= 1 && dow <= 5;
  }

  if (evt.repeatRule === 'interval') {
    const interval = Math.max(1, evt.repeatIntervalWeeks || 1);
    const allowed = evt.repeatDays.length ? evt.repeatDays : [start.getDay()];
    if (!allowed.includes(dayDate.getDay())) return false;
    const weeksSince = Math.floor(daysBetween(startDay, dayStart) / 7);
    return weeksSince % interval === 0;
  }

  if (evt.repeatRule === 'custom') {
    const allowed = evt.repeatDays.length ? evt.repeatDays : [start.getDay()];
    return allowed.includes(dayDate.getDay());
  }

  return false;
}

export function materializeEventForDay(evt, dayDate) {
  const dayKey = toLocalDateKey(dayDate);
  const override = getInstanceOverride(evt, dayKey);
  const srcStart = override?.start ? new Date(override.start) : new Date(evt.start);
  const srcEnd = override?.end ? new Date(override.end) : new Date(evt.end);
  const durMs = Math.max(15 * 60 * 1000, srcEnd.getTime() - srcStart.getTime());

  if (evt.allDay) {
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);
    return {
      ...evt,
      displayStart: dayStart,
      displayEnd: dayEnd,
      instanceDateKey: dayKey,
    };
  }

  const dayStart = new Date(dayDate);
  dayStart.setHours(srcStart.getHours(), srcStart.getMinutes(), 0, 0);
  const dayEnd = new Date(dayStart.getTime() + durMs);
  return {
    ...evt,
    displayStart: dayStart,
    displayEnd: dayEnd,
    instanceDateKey: dayKey,
  };
}

export function getCalendarEventsForWeek(anchor, events) {
  const days = getWeekDays(anchor);
  const result = {};
  days.forEach((d) => {
    result[toLocalDateKey(d)] = [];
  });

  (events || []).forEach((rawEvt) => {
    const evt = normalizeCalendarEvent(rawEvt);
    days.forEach((day) => {
      if (!doesEventOccurOnDay(evt, day)) return;
      const key = toLocalDateKey(day);
      result[key].push(materializeEventForDay(evt, day));
    });
  });

  Object.keys(result).forEach((k) => {
    result[k].sort((a, b) => a.displayStart - b.displayStart);
  });
  return result;
}

export function getCalendarEventsForDay(dayDate, events) {
  const key = toLocalDateKey(dayDate);
  const week = getCalendarEventsForWeek(dayDate, events);
  return week[key] || [];
}

export function getMinutesSinceCalendarStart(dateObj) {
  const d = new Date(dateObj);
  return d.getHours() * 60 + d.getMinutes() - 60;
}

export function getTopFromMinutes(min) {
  const pxPerMin = 56 / 60;
  return min * pxPerMin;
}

export function clampCalendarMinutes(min) {
  return Math.max(0, Math.min(23 * 60, min));
}

export function softSnapCalendarMinute(minute) {
  const rounded5 = Math.round(minute / 5) * 5;
  const nearest15 = Math.round(minute / 15) * 15;
  const delta = Math.abs(rounded5 - nearest15);
  return delta <= 4 ? nearest15 : rounded5;
}

export function minutesToLabel(minuteOffset) {
  const total = minuteOffset + 60;
  const hour = Math.floor(total / 60);
  const mins = total % 60;
  const base = new Date();
  base.setHours(hour % 24, mins, 0, 0);
  return base.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatCalendarEventTime(evt) {
  if (evt.allDay) return 'All day';
  return `${evt.displayStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${evt.displayEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

export function formatWeekRangeLabel(anchor) {
  const days = getWeekDays(anchor);
  const start = days[0];
  const end = days[6];
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function truncateNotes(text, maxLen = 48) {
  const value = (text || '').trim();
  if (!value) return '';
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
}

export { getWeekDays, toLocalDateKey, parseLocalDateKey, addDays };
