export function addDays(dateObj, days) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + days);
  return d;
}

export function toLocalDateKey(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDateKey(dateKey) {
  const parts = (dateKey || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

export function getTodayKey() {
  return toLocalDateKey(new Date());
}

export function startOfWeek(dateObj) {
  const d = new Date(dateObj);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getWeekDays(anchor) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
}

export function toDateTimeLocalKey(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

export function parseDateTimeLocalKey(value) {
  if (!value) return new Date();
  return new Date(value);
}
