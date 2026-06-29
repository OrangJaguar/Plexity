import * as chrono from 'chrono-node';
import { toDateTimeLocalKey } from '@/lib/tools/date';

const CREATE_RE = /\b(add|create|schedule|book|put|set up|remind me to|remind me|please)\b/i;
const TASK_RE = /\b(task|todo|to-?do|reminder|homework|assignment)\b/i;
const EVENT_RE = /\b(meeting|event|appointment|class|practice|session|call)\b/i;

const QUERY_START_RE = /^(what|when|where|who|how|show|list|tell|do|am|is|are|can|will|did)\b/i;
const QUERY_PHRASE_RE = /\b(how many|how much|what'?s|what is|what are|when is|when are|show me|tell me|do i have|is there|are there|anything|any more|more .+ (left|remaining)|remaining|upcoming|on my calendar|on the calendar|schedule for|free time|what am i|what do i)\b/i;

const DAY_NAMES = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi;

const STRIP_FROM_TITLE = /\b(add|create|schedule|book|put|set up|remind me to|remind me|please|a|an|the|new|task|todo|to-?do|reminder|due|on|for|at)\b/gi;

export function isQuestionIntent(text) {
  const input = text?.trim();
  if (!input) return false;
  if (input.endsWith('?')) return true;
  if (QUERY_START_RE.test(input)) return true;
  if (QUERY_PHRASE_RE.test(input)) return true;
  return false;
}

export function isCreateIntent(text) {
  return CREATE_RE.test(text || '');
}

function cleanTitle(raw) {
  return (raw || '')
    .replace(STRIP_FROM_TITLE, ' ')
    .replace(DAY_NAMES, ' ')
    .replace(/\b(tomorrow|today|next week|this week)\b/gi, ' ')
    .replace(/\d{1,2}(:\d{2})?\s*(am|pm)?/gi, ' ')
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function extractTitle(text, parsed) {
  let remaining = text;
  const sorted = [...parsed].sort((a, b) => b.text.length - a.text.length);
  for (const m of sorted) {
    remaining = remaining.replace(m.text, ' ');
  }
  const title = cleanTitle(remaining);
  return title.length >= 2 ? title : 'Untitled';
}

function hasSpecificTime(match) {
  return match.start?.isCertain('hour') || match.start?.isCertain('minute');
}

function hasEndTime(match) {
  return Boolean(match.end?.isCertain('hour') || match.end?.isCertain('minute'));
}

function shouldCreateEvents(input, parsed, isExplicitTask, isExplicitEvent) {
  if (isExplicitTask && !isExplicitEvent) return false;
  if (isExplicitEvent) return true;
  return parsed.some((m) => hasSpecificTime(m) || hasEndTime(m));
}

function defaultEnd(start) {
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return end;
}

function matchToRange(match) {
  const start = match.start?.date();
  if (!start) return null;
  let end = match.end?.date();
  if (!end || end <= start) end = defaultEnd(start);
  return { start, end };
}

/**
 * Parse slash prefix then fall through to NL parser on remainder.
 */
export function parseSlashCommand(text, refDate = new Date()) {
  const trimmed = (text || '').trim();
  if (!trimmed.startsWith('/')) return parseCommandLocally(text, refDate);
  const rest = trimmed.slice(1);
  const spaceIdx = rest.indexOf(' ');
  const commandId = (spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)).toLowerCase();
  const remainder = spaceIdx === -1 ? '' : rest.slice(spaceIdx + 1).trim();
  const local = parseCommandLocally(remainder || trimmed, refDate);
  return { ...local, commandId, slashRemainder: remainder };
}

/**
 * @returns {{ confidence: 'high'|'low'|'none', intent: string, query?: string, task?: object, events?: object[] }}
 */
export function parseCommandLocally(text, refDate = new Date()) {
  const input = text?.trim();
  if (!input) return { confidence: 'none', intent: 'empty' };

  const question = isQuestionIntent(input);
  const creating = isCreateIntent(input);
  const isExplicitTask = TASK_RE.test(input);
  const isExplicitEvent = EVENT_RE.test(input);

  const parsed = chrono.parse(input, refDate, { forwardDate: true });

  /* Questions win over chrono date matches — “how many events today” is not a task title */
  if (question && !creating) {
    return { confidence: 'high', intent: 'query', query: input };
  }

  const wantsEvent = shouldCreateEvents(input, parsed, isExplicitTask, isExplicitEvent);

  if (parsed.length > 0 && wantsEvent && (creating || isExplicitEvent)) {
    const events = parsed.map((match) => {
      const range = matchToRange(match);
      if (!range) return null;
      return {
        title: extractTitle(input, parsed),
        start: toDateTimeLocalKey(range.start),
        end: toDateTimeLocalKey(range.end),
      };
    }).filter(Boolean);

    if (events.length) {
      return { confidence: 'high', intent: 'create_events', events };
    }
  }

  if (creating || isExplicitTask || (parsed.length > 0 && !wantsEvent && !question)) {
    const dueMatch = parsed[0];
    const dueDate = dueMatch?.start?.date() || null;
    const title = extractTitle(input, parsed);

    if (title && title !== 'Untitled') {
      return {
        confidence: dueDate || isExplicitTask ? 'high' : 'low',
        intent: 'create_task',
        task: {
          title,
          due: dueDate ? toDateTimeLocalKey(dueDate) : '',
          priority: 'medium',
        },
      };
    }
  }

  if (question) {
    return { confidence: 'high', intent: 'query', query: input };
  }

  return { confidence: 'none', intent: 'unknown', raw: input };
}

export function formatEventPreview(event) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const day = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const t1 = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const t2 = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${event.title} · ${day} ${t1}–${t2}`;
}

export function formatTaskPreview(task) {
  const due = task.due
    ? new Date(task.due).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'No due date';
  return `${task.title} · due ${due}`;
}

/** Split multi-event phrasing into per-event titles when possible */
export function enrichParsedEvents(input, events) {
  if (!events?.length || events.length === 1) return events;
  const baseTitle = extractTitle(input, chrono.parse(input));
  return events.map((ev) => ({
    ...ev,
    title: events.length > 1 && baseTitle !== 'Untitled' ? baseTitle : ev.title,
  }));
}
