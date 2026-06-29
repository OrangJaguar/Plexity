import { TOOL_CATALOG_ROUTE, getToolsByIds } from '@/lib/tools/registry';

/**
 * @param {string[]} pinnedToolIds
 */
export function getToolsNavItems(pinnedToolIds) {
  return getToolsByIds(pinnedToolIds).map((tool) => ({
    to: tool.route,
    label: tool.label,
    icon: tool.icon,
    toolId: tool.id,
  }));
}

export const TOOLS_CATALOG_NAV_ITEM = {
  to: TOOL_CATALOG_ROUTE,
  label: 'Catalog',
  icon: null,
};

export const TOOLS_SETTINGS_ROUTE = '/tools/settings';

/** @deprecated use getToolsNavItems(pinnedToolIds) */
export const TOOLS_NAV_ITEMS = getToolsNavItems(
  ['dashboard', 'tasks', 'calendar', 'focus', 'grades', 'journal'],
);
