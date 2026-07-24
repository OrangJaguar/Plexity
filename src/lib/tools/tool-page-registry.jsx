import ToolsDashboardPage from '@/pages/tools/ToolsDashboardPage';
import ToolsTasksPage from '@/pages/tools/ToolsTasksPage';
import ToolsCalendarPage from '@/pages/tools/ToolsCalendarPage';
import ToolsFocusPage from '@/pages/tools/ToolsFocusPage';
import ToolsGradesPage from '@/pages/tools/ToolsGradesPage';
import ToolsPdfToolsPage from '@/pages/tools/ToolsPdfToolsPage';
import ToolsStocksPage from '@/pages/tools/ToolsStocksPage';
import ToolsTypingPage from '@/pages/tools/ToolsTypingPage';
import ToolsCollegePage from '@/pages/tools/ToolsCollegePage';
import ToolsUnitsPage from '@/pages/tools/ToolsUnitsPage';
import ToolsConverterPage from '@/pages/tools/ToolsConverterPage';
import ToolsVideoPage from '@/pages/tools/ToolsVideoPage';
import ToolsImagePage from '@/pages/tools/ToolsImagePage';
import ToolsJournalPage from '@/pages/tools/ToolsJournalPage';
import ToolsGoalsPage from '@/pages/tools/ToolsGoalsPage';
import ToolsProfileToolPage from '@/pages/tools/ToolsProfileToolPage';
import ToolsListsPage from '@/pages/tools/ToolsListsPage';
import ToolsPasswordsPage from '@/pages/tools/ToolsPasswordsPage';
import ToolsCalculatorPage from '@/pages/tools/ToolsCalculatorPage';
import {
  TOOL_PAGE_META,
  assertToolPageManifestParity,
  EXPECTED_TOOL_COUNT,
  WILDCARD_TOOL_IDS,
} from '@/lib/tools/tool-page-meta';

export { assertToolPageManifestParity, EXPECTED_TOOL_COUNT, WILDCARD_TOOL_IDS, TOOL_PAGE_META };

const PAGE_BY_ID = {
  dashboard: ToolsDashboardPage,
  tasks: ToolsTasksPage,
  calendar: ToolsCalendarPage,
  focus: ToolsFocusPage,
  goals: ToolsGoalsPage,
  journal: ToolsJournalPage,
  profile: ToolsProfileToolPage,
  lists: ToolsListsPage,
  passwords: ToolsPasswordsPage,
  calculator: ToolsCalculatorPage,
  grades: ToolsGradesPage,
  pdftools: ToolsPdfToolsPage,
  stocks: ToolsStocksPage,
  typing: ToolsTypingPage,
  college: ToolsCollegePage,
  units: ToolsUnitsPage,
  converter: ToolsConverterPage,
  video: ToolsVideoPage,
  image: ToolsImagePage,
};

/**
 * Executable page manifest — one page module per registry tool.
 * Public and admin routes both reference the same Page component.
 *
 * @typedef {Object} ToolPageEntry
 * @property {import('@/lib/tools/registry').ToolId} id
 * @property {string} route
 * @property {import('react').ComponentType} Page
 * @property {boolean} wildcard
 */

/** @type {ToolPageEntry[]} */
export const TOOL_PAGE_REGISTRY = TOOL_PAGE_META.map((meta) => ({
  ...meta,
  Page: PAGE_BY_ID[meta.id],
}));
