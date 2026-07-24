import { toDateTimeLocalKey } from '@/lib/tools/date';
import { getToolRoute, getToolsHome } from '@/lib/tools/tool-routes';

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

/**
 * @param {object} result
 * @param {string} kind
 * @param {{ basePath?: string, surface?: string }} [routeOpts]
 * @returns {{ route: string, state: { commandBar: object } }}
 */
export function buildCommandBarNavigation(result, kind, routeOpts = {}) {
  const asEvent = kind === 'event' || result.intent === 'create_events';

  if (asEvent) {
    const draft = result.events?.[0] || taskDraftToEventDraft(result.task);
    return {
      route: getToolRoute('calendar', routeOpts),
      state: { commandBar: { type: 'event', draft } },
    };
  }

  const draft = result.task || eventDraftToTaskDraft(result.events?.[0]);
  return {
    route: getToolRoute('tasks', routeOpts),
    state: { commandBar: { type: 'task', draft } },
  };
}

/**
 * @param {object} result
 * @param {{ basePath?: string, surface?: string }} [routeOpts]
 * @returns {{ route: string, state: { commandBar: object } }}
 */
export function buildCommandBarAction(result, routeOpts = {}) {
  const fallback = getToolsHome(routeOpts);
  let route = result.route || fallback;
  // If a caller already produced a scoped route, keep it; otherwise scope a public path.
  if (routeOpts.basePath && route.startsWith('/') && !route.startsWith(routeOpts.basePath)) {
    route = `${routeOpts.basePath}${route}`;
  }
  return {
    route,
    state: {
      commandBar: {
        type: 'action',
        actionId: result.actionId,
        payload: result.payload || {},
      },
    },
  };
}
