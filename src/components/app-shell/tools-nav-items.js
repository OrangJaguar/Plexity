import { getToolsByIds } from '@/lib/tools/registry';
import { getToolRoute, TOOLS_SETTINGS_ROUTE } from '@/lib/tools/tool-routes';

export { TOOLS_SETTINGS_ROUTE };

/**
 * @param {string[]} pinnedToolIds
 * @param {{ toolRoute?: (id: string) => string, excludeDesktopOnly?: boolean }} [opts]
 */
export function getToolsNavItems(pinnedToolIds, opts = {}) {
  const resolve = opts.toolRoute ?? ((id) => getToolRoute(id));
  return getToolsByIds(pinnedToolIds)
    .filter((tool) => !(opts.excludeDesktopOnly && tool.desktopOnly))
    .map((tool) => ({
      to: resolve(tool.id),
      label: tool.label,
      icon: tool.icon,
      toolId: tool.id,
      canonicalRoute: tool.route,
      sidebarIconActive: tool.sidebarIconActive ?? 'fill',
    }));
}

export const TOOLS_CATALOG_NAV_ITEM = {
  to: '/catalog',
  label: 'Catalog',
  icon: null,
};
