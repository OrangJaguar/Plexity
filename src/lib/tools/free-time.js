import { buildTodayTimeline } from './schedule-engine';

const MS_MIN = 60 * 1000;

export function computeFreeTimeMinutes(now, schedule, calendarEvents, tasks, settings = {}) {
  const sleepBuffer = settings.toolsSleepBufferMin ?? 480;
  const travelBuffer = settings.toolsTravelBufferMin ?? 30;
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const timeline = buildTodayTimeline(now, schedule, calendarEvents);
  let blockedMs = 0;

  timeline.forEach(({ start, end }) => {
    const s = start < now ? now : start;
    const e = end > endOfDay ? endOfDay : end;
    if (e > s) blockedMs += e - s;
  });

  const taskMinutes = (tasks || [])
    .filter((t) => !t.completed)
    .reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

  const remainingMs = Math.max(0, endOfDay - now);
  const freeMs = remainingMs - blockedMs - sleepBuffer * MS_MIN - travelBuffer * MS_MIN - taskMinutes * MS_MIN;
  return Math.max(0, Math.round(freeMs / MS_MIN));
}

export function formatFreeTimeHours(minutes) {
  const h = Math.round((minutes / 60) * 10) / 10;
  return `~${h}h`;
}
