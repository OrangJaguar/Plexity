import { migrateScheduleToBlocks } from './schedule-engine';

const EMPTY_SCHEDULE = {
  weekday: [],
  wednesday: [],
  exceptions: [],
  recurringBlocks: [],
  templateA: [],
  templateB: [],
  useAbTemplates: false,
  activeTemplate: 'A',
  dayTypeOverride: null,
};

/** Normalize a base44 ToolsSchedule row (or null). New users get empty schedule — no hardcoded defaults. */
export function normalizeSchedule(row) {
  const base = row ? {
    weekday: row.weekday ?? [],
    wednesday: row.wednesday ?? [],
    exceptions: row.exceptions ?? [],
    recurringBlocks: row.recurringBlocks ?? [],
    templateA: row.templateA ?? [],
    templateB: row.templateB ?? [],
    useAbTemplates: row.useAbTemplates ?? false,
    activeTemplate: row.activeTemplate ?? 'A',
    dayTypeOverride: row.dayTypeOverride ?? null,
    id: row.id,
  } : { ...EMPTY_SCHEDULE };
  return migrateScheduleToBlocks(base);
}

export function localScheduleFallback() {
  return normalizeSchedule(null);
}
