import { STORAGE_PREFIX } from '@/lib/branding/constants';

const P = STORAGE_PREFIX;

export const GUEST_PREFIX = `${P}.guest.`;

export const STORAGE_KEYS = {
  guest: {
    tasks: `${GUEST_PREFIX}ToolsTask`,
    calendar: `${GUEST_PREFIX}ToolsCalendarEvent`,
    schedule: `${GUEST_PREFIX}ToolsSchedule`,
    journal: `${GUEST_PREFIX}ToolsJournalEntry`,
    focus: `${GUEST_PREFIX}ToolsFocusSession`,
    grades: `${GUEST_PREFIX}ToolsGrades`,
    goals: `${GUEST_PREFIX}ToolsGoals`,
    lists: `${GUEST_PREFIX}ToolsLists`,
    profile: `${GUEST_PREFIX}ToolsProfile`,
    college: `${GUEST_PREFIX}ToolsCollege`,
    calculator: `${GUEST_PREFIX}ToolsCalculator`,
    stocks: `${GUEST_PREFIX}ToolsStocksWorkspace`,
    preferences: `${GUEST_PREFIX}UserPreferences`,
    passwords: `${GUEST_PREFIX}ToolsPasswords`,
  },
  localOnlyNotice: `${P}.notice.localOnly.v1`,
  preferences: `${P}_preferences`,
  pinnedToolIds: `${P}.pinnedToolIds`,
  toolsSettings: `${P}.toolsSettings`,
  toolsChromeCollapsed: `${P}.toolsChromeCollapsed`,
  queryCacheLegacy: `${P}-query-cache`,
  anonymousId: `${P}_anonymous_id`,
  tasksSortMode: `${P}.tasksSortMode`,
  unitsUi: `${P}.unitsUi`,
  gradesUi: `${P}.gradesUi`,
  stocksRecent: `${P}-stocks-recent`,
  stocksScreenerPresets: `${P}-stocks-screener-presets`,
  toolsGrades: `${P}.toolsGrades`,
  toolsPasswords: `${P}.toolsPasswords`,
  toolsGoals: `${P}.toolsGoals`,
  toolsLists: `${P}.toolsLists`,
  toolsProfile: `${P}.toolsProfile`,
  toolsCollege: `${P}.toolsCollege`,
  toolsCalculator: `${P}.toolsCalculator`,
  toolsStocksWorkspace: `${P}.toolsStocksWorkspace`,
};

export function migratedKey(entityName) {
  return `${P}.migrated.${entityName}`;
}

export function queryCacheKeyForEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return `${STORAGE_KEYS.queryCacheLegacy}:${encodeURIComponent(normalized)}`;
}

export function passwordsKeyForUser(email) {
  return `${STORAGE_KEYS.toolsPasswords}.${email}`;
}

/** Map Base44 entity names to guest localStorage keys. */
export const GUEST_ENTITY_KEYS = {
  ToolsGoals: STORAGE_KEYS.guest.goals,
  ToolsLists: STORAGE_KEYS.guest.lists,
  ToolsProfile: STORAGE_KEYS.guest.profile,
  ToolsCollege: STORAGE_KEYS.guest.college,
  ToolsCalculator: STORAGE_KEYS.guest.calculator,
  ToolsStocksWorkspace: STORAGE_KEYS.guest.stocks,
};
