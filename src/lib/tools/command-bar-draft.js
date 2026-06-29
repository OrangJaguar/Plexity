import { toDateTimeLocalKey } from '@/lib/tools/date';

export function defaultEndFromStart(start) {
  if (!start) return '';
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return '';
  d.setHours(d.getHours() + 1);
  return toDateTimeLocalKey(d);
}

export function taskDraftToEventDraft(task) {
  const start = task?.due || '';
  return {
    title: task?.title || '',
    start,
    end: defaultEndFromStart(start),
  };
}

export function eventDraftToTaskDraft(event) {
  return {
    title: event?.title || '',
    due: event?.start || '',
    priority: 'medium',
  };
}

export function taskFormToEventDraft(form) {
  return taskDraftToEventDraft({ title: form.title, due: form.due });
}

export function eventFormToTaskDraft({ title, start }) {
  return eventDraftToTaskDraft({ title, start });
}

/** @returns {{ route: string, state: { commandBar: object } }} */
export function buildCommandBarNavigation(result, kind) {
  const asEvent = kind === 'event' || result.intent === 'create_events';

  if (asEvent) {
    const draft = result.events?.[0] || taskDraftToEventDraft(result.task);
    return {
      route: '/tools/calendar',
      state: { commandBar: { type: 'event', draft } },
    };
  }

  const draft = result.task || eventDraftToTaskDraft(result.events?.[0]);
  return {
    route: '/tools/tasks',
    state: { commandBar: { type: 'task', draft } },
  };
}

/** @returns {{ route: string, state: { commandBar: object } }} */
export function buildCommandBarAction(result) {
  return {
    route: result.route || '/tools/dashboard',
    state: {
      commandBar: {
        type: 'action',
        actionId: result.actionId,
        payload: result.payload || {},
      },
    },
  };
}
