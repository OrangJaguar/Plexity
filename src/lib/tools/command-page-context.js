import { TOOL_REGISTRY } from '@/lib/tools/registry';

const ROUTE_PAGE_MAP = [
  { prefix: '/tools/dashboard', pageId: 'dashboard' },
  { prefix: '/tools/tasks', pageId: 'tasks' },
  { prefix: '/tools/calendar', pageId: 'calendar' },
  { prefix: '/tools/focus', pageId: 'focus' },
  { prefix: '/tools/goals', pageId: 'goals' },
  { prefix: '/tools/journal', pageId: 'journal' },
  { prefix: '/tools/lists', pageId: 'lists' },
  { prefix: '/tools/calculator', pageId: 'calculator' },
  { prefix: '/tools/passwords', pageId: 'passwords' },
  { prefix: '/tools/catalog', pageId: 'catalog' },
  { prefix: '/tools/settings', pageId: 'settings' },
  { prefix: '/tools/grades', pageId: 'grades' },
  { prefix: '/tools/profile', pageId: 'profile' },
  { prefix: '/tools/typing', pageId: 'typing' },
  { prefix: '/tools/college', pageId: 'college' },
  { prefix: '/tools/units', pageId: 'units' },
  { prefix: '/tools/pdftools', pageId: 'pdftools' },
  { prefix: '/tools/pdf', pageId: 'pdftools' },
  { prefix: '/tools/stocks', pageId: 'stocks' },
];

/**
 * @param {string} pathname
 * @returns {{ pageId: string, route: string, toolLabel?: string }}
 */
export function resolvePageContext(pathname = '') {
  const route = pathname || '/';
  const match = ROUTE_PAGE_MAP.find(({ prefix }) => route === prefix || route.startsWith(`${prefix}/`));
  const pageId = match?.pageId || 'global';
  const tool = TOOL_REGISTRY.find((t) => route === t.route || route.startsWith(`${t.route}/`));
  return {
    pageId,
    route,
    toolLabel: tool?.label,
  };
}

export function getPlaceholderForPage(pageId) {
  const map = {
    calendar: 'Type / for commands, or ask about your week…',
    tasks: 'Type / for commands, or add homework due Friday…',
    focus: 'Type / to start a timer or focus on a task…',
    dashboard: 'Type / for shortcuts, or ask what’s next…',
    goals: 'Type / to add a goal or log progress…',
    journal: 'Type / for a new entry or search…',
    lists: 'Type / to add an item or list…',
    calculator: 'Type / to add an expression…',
    passwords: 'Type / to search or add a credential…',
    catalog: 'Type /goto to open a tool…',
  };
  return map[pageId] || 'Type / for commands, or ask about your schedule…';
}
