/**
 * Base44 entity ↔ Supabase table + column mapping.
 * Client keeps camelCase; Postgres uses snake_case (+ a few renames).
 */

/** @type {Record<string, string>} */
export const ENTITY_TABLE = {
  ToolsCalculator: 'tools_calculator',
  ToolsCollege: 'tools_college',
  ToolsGoals: 'tools_goals',
  ToolsLists: 'tools_lists',
  ToolsProfile: 'tools_profile',
  ToolsStocksWorkspace: 'tools_stocks_workspace',
  ToolsGrades: 'tools_grades',
  ToolsSchedule: 'tools_schedule',
  ToolsTask: 'tools_task',
  ToolsCalendarEvent: 'tools_calendar_event',
  ToolsJournalEntry: 'tools_journal_entry',
  ToolsFocusSession: 'tools_focus_session',
  ToolsFeedback: 'tools_feedback',
  UserPreferences: 'user_preferences',
  AdminAuditLog: 'admin_audit_log',
};

/** Client camelCase → SQL column (only exceptions to the default converter). */
const TO_SQL_OVERRIDES = {
  start: 'start_at',
  end: 'end_at',
};

/** SQL column → client camelCase */
const FROM_SQL_OVERRIDES = {
  start_at: 'start',
  end_at: 'end',
};

export function tableForEntity(entityName) {
  return ENTITY_TABLE[entityName] ?? null;
}

export function isKnownToolsEntity(entityName) {
  return Boolean(ENTITY_TABLE[entityName]);
}

export function camelToSnakeKey(key) {
  if (TO_SQL_OVERRIDES[key]) return TO_SQL_OVERRIDES[key];
  return String(key).replace(/([A-Z])/g, '_$1').toLowerCase();
}

export function snakeToCamelKey(key) {
  if (FROM_SQL_OVERRIDES[key]) return FROM_SQL_OVERRIDES[key];
  return String(key).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ stripId?: boolean }} [opts]
 */
export function toSqlRow(row, { stripId = false } = {}) {
  if (!row || typeof row !== 'object') return {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    if (stripId && key === 'id') continue;
    out[camelToSnakeKey(key)] = value;
  }
  return out;
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 */
export function fromSqlRow(row) {
  if (!row || typeof row !== 'object') return row;
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamelKey(key)] = value;
  }
  return out;
}

/**
 * @param {Record<string, unknown>} filter
 */
export function toSqlFilter(filter) {
  return toSqlRow(filter || {}, { stripId: false });
}
