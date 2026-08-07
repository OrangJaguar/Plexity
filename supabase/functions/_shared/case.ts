const TO_CAMEL_OVERRIDES: Record<string, string> = {
  start_at: 'start',
  end_at: 'end',
};

export function snakeToCamelKey(key: string) {
  if (TO_CAMEL_OVERRIDES[key]) return TO_CAMEL_OVERRIDES[key];
  return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function fromSqlRow<T extends Record<string, unknown>>(row: T | null | undefined) {
  if (!row || typeof row !== 'object') return row;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[snakeToCamelKey(key)] = value;
  }
  return out;
}
