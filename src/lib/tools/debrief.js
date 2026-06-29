import { toLocalDateKey, parseLocalDateKey, addDays } from './date';
import { getCalendarEventsForDay } from './calendar-repeat';

export function getDebriefItemsForToday(calendarEvents, tasks) {
  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const dayStart = parseLocalDateKey(todayKey);
  const dayEnd = addDays(dayStart, 1);
  const items = [];

  const weekEvents = getCalendarEventsForDay(now, calendarEvents);
  weekEvents.forEach((evt) => {
    items.push({
      kind: 'event',
      title: evt.title || 'Untitled event',
      start: evt.displayStart,
      end: evt.displayEnd,
    });
  });

  (tasks || []).forEach((t) => {
    if (t.completed) return;
    if (!t.due) return;
    const due = new Date(t.due);
    if (due >= dayStart && due < dayEnd) {
      items.push({
        kind: 'task',
        title: t.title || 'Untitled task',
        start: due,
        end: due,
      });
    }
  });

  items.sort((a, b) => (a.start?.getTime?.() || 0) - (b.start?.getTime?.() || 0));
  return items;
}

export function computeDailyDebriefStats(items) {
  let blockedMin = 0;
  let sleepMin = 0;
  let mealMin = 0;
  items.forEach((it) => {
    if (it.kind !== 'event' && it.kind !== 'linked') return;
    const dur = Math.max(0, Math.round(((it.end || it.start) - it.start) / 60000));
    blockedMin += dur;
    const t = (it.title || '').toLowerCase();
    if (/(sleep|bed|night)/.test(t)) sleepMin += dur;
    if (/(lunch|breakfast|dinner|meal|eat)/.test(t)) mealMin += dur;
  });
  const assumedSleep = Math.max(0, 8 * 60 - sleepMin);
  const assumedMeals = Math.max(0, 90 - mealMin);
  const roughFree = Math.max(0, 24 * 60 - blockedMin - assumedSleep - assumedMeals);
  return { blockedMin, assumedSleep, assumedMeals, roughFree };
}

export function formatDebriefItemTime(it) {
  if (!it.start) return 'No time';
  const startStr = it.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (it.end && it.end > it.start) {
    const endStr = it.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${startStr} - ${endStr}`;
  }
  return startStr;
}

export function formatDebriefClipboard(items, stats) {
  const lines = [
    `Daily Debrief (${new Date().toLocaleDateString()})`,
    `Items: ${items.length}`,
    `Calendar Blocked: ${Math.round((stats.blockedMin / 60) * 10) / 10}h`,
    `Estimated Free Time: ${Math.round((stats.roughFree / 60) * 10) / 10}h`,
    '',
    ...items.map((it) => `${it.kind.toUpperCase()} | ${it.title} | ${it.start ? it.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 'No time'}`),
  ];
  return lines.join('\n');
}
