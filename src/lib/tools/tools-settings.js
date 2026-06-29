export const TOOLS_SETTINGS_DEFAULTS = {
  toolsSleepBufferMin: 480,
  toolsTravelBufferMin: 30,
  toolsDashboardWidgets: {
    weather: false,
    quote: false,
    habits: false,
    stocks: false,
  },
  toolsCustomCategories: [],
  toolsHabitDefinitions: [],
  toolsHabitChecks: {},
  journalMinWords: 50,
  journalDailyPromptEnabled: false,
  focusLastPreset: 'standard',
  focusCustomWorkMin: 25,
  focusCustomBreakMin: 5,
  focusAmbientSound: 'off',
  focusAmbientVolume: 0.5,
  toolsWeatherCity: '',
  toolsWeatherLocation: null,
  toolsWeatherUnit: 'fahrenheit',
  toolsStockSymbols: [],
  toolsJournalTags: [],
};

export const JOURNAL_PROMPTS = [
  'What made today feel productive?',
  'What do you wish had gone differently?',
  'What are you grateful for today?',
  'What is one thing you learned today?',
  'What would make tomorrow easier?',
];

export const JOURNAL_PRESET_TAGS = [
  'study',
  'goals',
  'gratitude',
  'stress',
  'win',
  'reflection',
  'health',
  'social',
];

export const FOCUS_PRESETS = {
  deep: { label: 'Deep Work', workMin: 50, breakMin: 10 },
  standard: { label: 'Standard', workMin: 25, breakMin: 5 },
  sprint: { label: 'Quick Sprint', workMin: 15, breakMin: 5 },
  custom: { label: 'Custom', workMin: 25, breakMin: 5 },
};

export const DAILY_QUOTES = [
  'Small steps compound.',
  'Progress over perfection.',
  'Today\'s effort matters.',
  'Consistency wins.',
  'One priority is enough.',
  'Show up for yourself.',
  'Build the habit.',
  'Start where you are.',
];

export function getDailyQuote(date = new Date()) {
  return DAILY_QUOTES[date.getDate() % DAILY_QUOTES.length];
}

export function mergeToolsSettings(preferences) {
  if (!preferences) return { ...TOOLS_SETTINGS_DEFAULTS };
  return {
    ...TOOLS_SETTINGS_DEFAULTS,
    toolsSleepBufferMin: preferences.toolsSleepBufferMin ?? TOOLS_SETTINGS_DEFAULTS.toolsSleepBufferMin,
    toolsTravelBufferMin: preferences.toolsTravelBufferMin ?? TOOLS_SETTINGS_DEFAULTS.toolsTravelBufferMin,
    toolsDashboardWidgets: {
      ...TOOLS_SETTINGS_DEFAULTS.toolsDashboardWidgets,
      ...(preferences.toolsDashboardWidgets || {}),
    },
    toolsCustomCategories: preferences.toolsCustomCategories ?? [],
    toolsHabitDefinitions: preferences.toolsHabitDefinitions ?? [],
    toolsHabitChecks: preferences.toolsHabitChecks ?? {},
    journalMinWords: preferences.journalMinWords ?? TOOLS_SETTINGS_DEFAULTS.journalMinWords,
    journalDailyPromptEnabled: preferences.journalDailyPromptEnabled ?? false,
    focusLastPreset: preferences.focusLastPreset ?? 'standard',
    focusCustomWorkMin: preferences.focusCustomWorkMin ?? 25,
    focusCustomBreakMin: preferences.focusCustomBreakMin ?? 5,
    focusAmbientSound: preferences.focusAmbientSound ?? 'off',
    focusAmbientVolume: preferences.focusAmbientVolume ?? 0.5,
    toolsWeatherCity: preferences.toolsWeatherCity ?? '',
    toolsWeatherLocation: preferences.toolsWeatherLocation ?? null,
    toolsWeatherUnit: preferences.toolsWeatherUnit ?? 'fahrenheit',
    toolsStockSymbols: preferences.toolsStockSymbols ?? [],
    ...(preferences.toolsJournalTags !== undefined
      ? { toolsJournalTags: preferences.toolsJournalTags }
      : {}),
    journalPinHash: preferences.journalPinHash ?? '',
    journalGraceUsedAt: preferences.journalGraceUsedAt ?? null,
  };
}

export function getAllCategories(schedule, settings) {
  const fromSchedule = new Set();
  const migrated = schedule?.recurringBlocks || [];
  migrated.forEach((b) => { if (b.title) fromSchedule.add(b.title); });
  (schedule?.weekday || []).forEach((m) => { if (m.cls) fromSchedule.add(m.cls); });
  (settings?.toolsCustomCategories || []).forEach((c) => fromSchedule.add(c));
  return [...fromSchedule];
}
