import { getToolsByIds } from '@/lib/tools/registry';
export { TOOLS_SETTINGS_ROUTE } from '@/lib/tools/tool-routes';

/**
 * @param {string[]} pinnedToolIds
 */
export function getToolsNavItems(pinnedToolIds) {
  return getToolsByIds(pinnedToolIds).map((tool) => ({
    to: tool.route,
    label: tool.label,
    icon: tool.icon,
    toolId: tool.id,
    sidebarIconActive: tool.sidebarIconActive ?? 'fill',
  }));
}

export const TOOLS_CATALOG_NAV_ITEM = {
  to: '/catalog',
  label: 'Catalog',
  icon: null,
};

/** @deprecated use getToolsNavItems(pinnedToolIds) */
export const TOOLS_NAV_ITEMS = getToolsNavItems(
  ['dashboard', 'tasks', 'calendar', 'focus', 'journal'],
);
