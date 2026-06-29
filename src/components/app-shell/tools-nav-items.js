import { getToolsByIds } from '@/lib/tools/registry';

/** Strip legacy /tools prefix so routes work with the new flat paths */
function toFlatRoute(route) {
  return route.startsWith('/tools/') ? route.slice(6) : route;
}

/**
 * @param {string[]} pinnedToolIds
 */
export function getToolsNavItems(pinnedToolIds) {
  return getToolsByIds(pinnedToolIds).map((tool) => ({
    to: toFlatRoute(tool.route),
    label: tool.label,
    icon: tool.icon,
    toolId: tool.id,
  }));
}

export const TOOLS_CATALOG_NAV_ITEM = {
  to: '/catalog',
  label: 'Catalog',
  icon: null,
};

export const TOOLS_SETTINGS_ROUTE = '/settings';

/** @deprecated use getToolsNavItems(pinnedToolIds) */
export const TOOLS_NAV_ITEMS = getToolsNavItems(
  ['dashboard', 'tasks', 'calendar', 'focus', 'journal'],
);