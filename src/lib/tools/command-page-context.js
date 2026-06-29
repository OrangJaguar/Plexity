import { TOOL_CATALOG_ROUTE, TOOL_REGISTRY } from '@/lib/tools/registry';
import { TOOLS_SETTINGS_ROUTE, normalizeToolPathname } from '@/lib/tools/tool-routes';

const ROUTE_PAGE_MAP = [
  ...TOOL_REGISTRY.map((t) => ({ prefix: t.route, pageId: t.id })),
  { prefix: TOOL_CATALOG_ROUTE, pageId: 'catalog' },
  { prefix: TOOLS_SETTINGS_ROUTE, pageId: 'settings' },
].sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * @param {string} pathname
 * @returns {{ pageId: string, route: string, toolLabel?: string }}
 */
export function resolvePageContext(pathname = '') {
  const route = normalizeToolPathname(pathname || '/');
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
