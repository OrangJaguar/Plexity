import { parseCmdTimeString, formatCmdLocaleTime, formatCountdown } from './time-format';
import { toLocalDateKey } from './date';

function parseTimeOnDate(timeStr, date) {
  const { hours, minutes } = parseCmdTimeString(timeStr);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

function legacyModsToBlocks(mods, days) {
  return (mods || []).map((mod, i) => ({
    id: `legacy-${days.join('-')}-${i}`,
    title: mod.cls || mod.title || 'Block',
    days,
    start: mod.start,
    end: mod.end,
    source: 'schedule',
  }));
}

export function migrateScheduleToBlocks(schedule) {
  if (schedule?.recurringBlocks?.length) return schedule;
  const weekday = schedule?.weekday?.length ? schedule.weekday : [];
  const wednesday = schedule?.wednesday?.length ? schedule.wednesday : [];
  const blocks = [
    ...legacyModsToBlocks(weekday, [0, 1, 2, 4, 5, 6]),
    ...legacyModsToBlocks(wednesday, [3]),
  ];
  return { ...schedule, recurringBlocks: blocks };
}

export function getActiveBlocksForDay(schedule, now) {
  const migrated = migrateScheduleToBlocks(schedule || {});
  const day = now.getDay();
  const dateKey = toLocalDateKey(now);

  if (migrated.useAbTemplates) {
    const templateKey = migrated.dayTypeOverride || migrated.activeTemplate || 'A';
    const template = templateKey === 'B' ? migrated.templateB : migrated.templateA;
    return (template || []).filter((b) => (b.days || []).includes(day));
  }

  return (migrated.recurringBlocks || []).filter((b) => (b.days || []).includes(day));
}

export function buildTodayTimeline(now, schedule, calendarEvents = []) {
  const blocks = getActiveBlocksForDay(schedule, now);
  const items = [];

  blocks.forEach((block) => {
    const start = parseTimeOnDate(block.start, now);
    const end = parseTimeOnDate(block.end, now);
    if (end <= start) return;
    items.push({
      id: block.id || block.title,
      title: block.title,
      start,
      end,
      source: 'schedule',
    });
  });

  const dateKey = toLocalDateKey(now);
  (calendarEvents || []).forEach((ev) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);
    if (toLocalDateKey(start) !== dateKey && toLocalDateKey(end) !== dateKey) return;
    items.push({
      id: ev.eventId || ev.id,
      title: ev.title,
      start,
      end,
      source: 'calendar',
      color: ev.color,
    });
  });

  items.sort((a, b) => a.start - b.start);
  return items;
}

export function getDashboardFromTimeline(now, timeline) {
  const liveClock = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });

  if (!timeline.length) {
    return {
      hasSchedule: false,
      now: 'Nothing scheduled.',
      until: '--',
      next: 'Nothing more today.',
      countdown: liveClock,
      countdownMode: 'clock',
      timeline: [],
      currentIndex: -1,
    };
  }

  let currentIndex = -1;
  for (let i = 0; i < timeline.length; i++) {
    if (now >= timeline[i].start && now < timeline[i].end) {
      currentIndex = i;
      break;
    }
  }

  let gapBeforeNext = -1;
  if (currentIndex === -1) {
    for (let i = 0; i < timeline.length; i++) {
      if (now < timeline[i].start) {
        gapBeforeNext = i;
        break;
      }
    }
  }

  const current = currentIndex >= 0 ? timeline[currentIndex] : null;
  const nextItem = currentIndex >= 0
    ? timeline.slice(currentIndex + 1).find((t) => t.title !== current?.title || t.start > current.end)
    : (gapBeforeNext >= 0 ? timeline[gapBeforeNext] : null);

  const lastEnd = timeline[timeline.length - 1]?.end;
  const dayOver = lastEnd && now >= lastEnd;

  let until;
  if (current) {
    until = `${formatCmdLocaleTime(current.start)} – ${formatCmdLocaleTime(current.end)}`;
  } else if (nextItem) {
    until = `Next: ${formatCmdLocaleTime(nextItem.start)}`;
  } else if (dayOver) {
    until = 'Nothing more today.';
  } else {
    until = 'Nothing scheduled.';
  }

  let next;
  if (dayOver || (!nextItem && !current)) {
    next = 'Nothing more today.';
  } else if (nextItem) {
    next = `${nextItem.title} · ${formatCmdLocaleTime(nextItem.start)}`;
  } else {
    next = 'Nothing more today.';
  }

  let countdown;
  let countdownMode;
  if (current) {
    countdown = formatCountdown(Math.max(0, Math.floor((current.end - now) / 1000)));
    countdownMode = 'countdown';
  } else if (nextItem && now < nextItem.start) {
    countdown = formatCountdown(Math.max(0, Math.floor((nextItem.start - now) / 1000)));
    countdownMode = 'countdown';
  } else {
    countdown = liveClock;
    countdownMode = 'clock';
  }

  return {
    hasSchedule: true,
    now: current?.title || 'Nothing scheduled.',
    until,
    next,
    countdown,
    countdownMode,
    timeline,
    currentIndex,
  };
}

export function getDashboardStateFromEngine(now, schedule, calendarEvents) {
  const timeline = buildTodayTimeline(now, schedule, calendarEvents);
  return getDashboardFromTimeline(now, timeline);
}
