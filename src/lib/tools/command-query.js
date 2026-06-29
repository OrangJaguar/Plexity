import { addDays, getTodayKey, parseLocalDateKey, toLocalDateKey } from '@/lib/tools/date';
import { getDashboardStateFromEngine } from '@/lib/tools/schedule-engine';
import { normalizeSchedule } from '@/lib/tools/schedule-data';
import { getSuggestedCommands } from '@/lib/tools/command-registry';

function resolveRangeFromQuery(query, ref = new Date()) {
  const q = query.toLowerCase();
  if (q.includes('tomorrow')) {
    const d = addDays(ref, 1);
    return { start: d, end: addDays(d, 1), label: 'tomorrow' };
  }
  if (q.includes('this week')) {
    const start = new Date(ref);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 7);
    return { start, end, label: 'this week' };
  }
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  const end = addDays(start, 1);
  return { start, end, label: 'today' };
}

function inRange(iso, start, end) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t < end.getTime();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function wantsRemainingOnly(query) {
  const q = query.toLowerCase();
  return /\b(more|left|remaining|upcoming|still)\b/.test(q);
}

function countAnswer(noun, count, label, remaining = false) {
  const word = count === 1 ? noun : `${noun}s`;
  const prefix = remaining ? `${count} more ${word}` : `${count} ${word}`;
  return `${prefix} ${label}.`;
}

export function answerQueryLocally(query, { tasks = [], events = [], schedule } = {}) {
  const q = (query || '').toLowerCase();
  const ref = new Date();
  const { start, end, label } = resolveRangeFromQuery(query, ref);
  const remainingOnly = wantsRemainingOnly(query);

  if (q.includes('free time') || q.includes('free')) {
    const state = getDashboardStateFromEngine(ref, normalizeSchedule(schedule), events);
    return {
      answer: state.hasSchedule
        ? `Right now: ${state.now}. Next: ${state.next}. Countdown: ${state.countdown}.`
        : 'No recurring schedule blocks are set for today.',
    };
  }

  if (/\bhow many\b/.test(q) && (q.includes('event') || q.includes('meeting') || q.includes('calendar') || q.includes('scheduled'))) {
    const dayEvents = events.filter((e) => inRange(e.start, start, end));
    const pool = remainingOnly
      ? dayEvents.filter((e) => new Date(e.end).getTime() > ref.getTime())
      : dayEvents;
    if (!pool.length) {
      return { answer: remainingOnly ? `No more events ${label}.` : `Nothing on your calendar ${label}.` };
    }
    const lines = pool.slice(0, 6).map((e) => `• ${e.title} (${formatTime(e.start)}–${formatTime(e.end)})`);
    return {
      answer: `${countAnswer('event', pool.length, label, remainingOnly)}\n${lines.join('\n')}`,
    };
  }

  if (/\bhow many\b/.test(q) && (q.includes('task') || q.includes('todo') || q.includes('due'))) {
    const open = tasks.filter((t) => !t.completed);
    const due = open.filter((t) => inRange(t.due, start, end));
    if (!due.length) {
      return { answer: `No open tasks due ${label}. You have ${open.length} open task${open.length === 1 ? '' : 's'} total.` };
    }
    const lines = due.slice(0, 6).map((t) => `• ${t.title}${t.due ? ` (${formatTime(t.due)})` : ''}`);
    return {
      answer: `${countAnswer('task', due.length, `due ${label}`)}\n${lines.join('\n')}`,
    };
  }

  if (q.includes('task') || q.includes('due') || q.includes('todo')) {
    const open = tasks.filter((t) => !t.completed);
    const due = open.filter((t) => inRange(t.due, start, end));
    if (!due.length) {
      return { answer: `No open tasks due ${label}. You have ${open.length} open task${open.length === 1 ? '' : 's'} total.` };
    }
    const lines = due.slice(0, 6).map((t) => `• ${t.title}${t.due ? ` (${formatTime(t.due)})` : ''}`);
    return {
      answer: `${due.length} task${due.length === 1 ? '' : 's'} due ${label}:\n${lines.join('\n')}`,
    };
  }

  if (q.includes('calendar') || q.includes('event') || q.includes('meeting') || q.includes('scheduled')) {
    const dayEvents = events.filter((e) => inRange(e.start, start, end));
    const pool = remainingOnly
      ? dayEvents.filter((e) => new Date(e.end).getTime() > ref.getTime())
      : dayEvents;
    if (!pool.length) {
      return { answer: remainingOnly ? `No more events ${label}.` : `Nothing on your calendar ${label}.` };
    }
    const lines = pool.slice(0, 6).map((e) => `• ${e.title} (${formatTime(e.start)}–${formatTime(e.end)})`);
    return {
      answer: `${pool.length} event${pool.length === 1 ? '' : 's'} ${remainingOnly ? `remaining ${label}` : label}:\n${lines.join('\n')}`,
    };
  }

  if (q.includes('class') || q.includes('now') || q.includes('next') || q.includes('what am i')) {
    const state = getDashboardStateFromEngine(ref, normalizeSchedule(schedule), events);
    return {
      answer: `NOW: ${state.now}. UNTIL: ${state.until}. NEXT: ${state.next}.`,
    };
  }

  const todayKey = getTodayKey();
  const todayTasks = tasks.filter((t) => !t.completed && t.due && toLocalDateKey(new Date(t.due)) === todayKey);
  const todayEvents = events.filter((e) => toLocalDateKey(new Date(e.start)) === todayKey);
  return {
    answer: `Today (${parseLocalDateKey(todayKey).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}): ${todayTasks.length} open task${todayTasks.length === 1 ? '' : 's'}, ${todayEvents.length} calendar event${todayEvents.length === 1 ? '' : 's'}.`,
  };
}

/** Tiny context summary for Gemini fallback (token-cheap). */
export function buildAssistantContext({ tasks = [], events = [], pageContext } = {}) {
  const todayKey = getTodayKey();
  const openTasks = tasks.filter((t) => !t.completed).length;
  const todayEvents = events
    .filter((e) => toLocalDateKey(new Date(e.start)) === todayKey)
    .slice(0, 4)
    .map((e) => e.title)
    .join(', ');
  const pageId = pageContext?.pageId || 'global';
  const suggestedCommandIds = getSuggestedCommands(pageId).map((c) => c.id);
  return {
    today: todayKey,
    openTasks,
    todayEventTitles: todayEvents || 'none',
    pageId,
    route: pageContext?.route || '/',
    suggestedCommandIds,
  };
}
