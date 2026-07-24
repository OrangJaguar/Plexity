import { TOOL_REGISTRY } from '@/lib/tools/registry';

/**
 * Serializable page-manifest metadata (no React imports).
 * Executable Page components live in tool-page-registry.jsx.
 *
 * @typedef {Object} ToolPageMeta
 * @property {import('@/lib/tools/registry').ToolId} id
 * @property {string} route
 * @property {boolean} wildcard
 */

/** @type {ToolPageMeta[]} */
export const TOOL_PAGE_META = [
  { id: 'dashboard', route: '/dashboard', wildcard: false },
  { id: 'tasks', route: '/tasks', wildcard: false },
  { id: 'calendar', route: '/calendar', wildcard: false },
  { id: 'focus', route: '/focus', wildcard: false },
  { id: 'goals', route: '/goals', wildcard: false },
  { id: 'journal', route: '/journal', wildcard: false },
  { id: 'profile', route: '/profile', wildcard: false },
  { id: 'lists', route: '/lists', wildcard: false },
  { id: 'passwords', route: '/passwords', wildcard: false },
  { id: 'calculator', route: '/calculator', wildcard: false },
  { id: 'grades', route: '/grades', wildcard: false },
  { id: 'pdftools', route: '/pdf', wildcard: true },
  { id: 'stocks', route: '/stocks', wildcard: true },
  { id: 'typing', route: '/typing', wildcard: false },
  { id: 'college', route: '/college', wildcard: false },
  { id: 'units', route: '/units', wildcard: false },
  { id: 'converter', route: '/convert', wildcard: false },
  { id: 'video', route: '/video', wildcard: false },
  { id: 'image', route: '/image', wildcard: false },
];

export const EXPECTED_TOOL_COUNT = 19;
export const WILDCARD_TOOL_IDS = Object.freeze(['pdftools', 'stocks']);

/**
 * @returns {{ ok: boolean, missingInPages: string[], missingInRegistry: string[], routeMismatches: string[] }}
 */
export function assertToolPageManifestParity(pageMeta = TOOL_PAGE_META) {
  const registryIds = TOOL_REGISTRY.map((t) => t.id);
  const pageIds = pageMeta.map((t) => t.id);
  const registryById = new Map(TOOL_REGISTRY.map((t) => [t.id, t]));
  const pageById = new Map(pageMeta.map((t) => [t.id, t]));

  const missingInPages = registryIds.filter((id) => !pageById.has(id));
  const missingInRegistry = pageIds.filter((id) => !registryById.has(id));
  const routeMismatches = pageIds
    .filter((id) => registryById.has(id) && pageById.get(id).route !== registryById.get(id).route)
    .map((id) => `${id}: page=${pageById.get(id).route} registry=${registryById.get(id).route}`);

  return {
    ok: missingInPages.length === 0 && missingInRegistry.length === 0 && routeMismatches.length === 0,
    missingInPages,
    missingInRegistry,
    routeMismatches,
  };
}
