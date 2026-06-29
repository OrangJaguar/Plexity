/** Local persistence for tools-related UserPreferences fields (until Base44 schema sync is reliable). */

export const TOOLS_SETTINGS_STORAGE_KEY = 'veridian.toolsSettings';

/** Preference keys owned by tools settings — persisted locally and merged over server on read. */
export const TOOLS_SETTINGS_PERSIST_KEYS = [
  'toolsDashboardWidgetLayout',
  'toolsDashboardWidgets',
  'toolsJournalTags',
  'toolsCustomCategories',
  'toolsHabitDefinitions',
  'toolsHabitChecks',
  'toolsSleepBufferMin',
  'toolsTravelBufferMin',
  'toolsWeatherCity',
  'toolsWeatherLocation',
  'toolsWeatherUnit',
  'toolsStockSymbols',
  'journalMinWords',
  'journalDailyPromptEnabled',
  'focusLastPreset',
  'focusCustomWorkMin',
  'focusCustomBreakMin',
  'focusAmbientSound',
  'focusAmbientVolume',
  'themeDark',
];

export function isToolsSettingsPatch(patch) {
  if (!patch || typeof patch !== 'object') return false;
  const keys = Object.keys(patch);
  return keys.length > 0 && keys.every((k) => TOOLS_SETTINGS_PERSIST_KEYS.includes(k));
}

export function readToolsSettingsFromStorage() {
  try {
    const raw = localStorage.getItem(TOOLS_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeToolsSettingsToStorage(patch) {
  if (!patch || typeof patch !== 'object') return;
  try {
    const existing = readToolsSettingsFromStorage() || {};
    localStorage.setItem(
      TOOLS_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...existing, ...patch }),
    );
  } catch {
    /* ignore quota errors */
  }
}

/** Merge server preferences with locally persisted tools settings (local wins). */
export function mergePreferencesWithLocalToolsSettings(data) {
  if (!data) return data;
  const local = readToolsSettingsFromStorage();
  if (!local) return data;
  const merged = { ...data };
  for (const key of TOOLS_SETTINGS_PERSIST_KEYS) {
    if (local[key] !== undefined) {
      merged[key] = local[key];
    }
  }
  return merged;
}
