export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatWeekLabel(weekKey) {
  if (!weekKey) return 'This week';
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekKey;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const jan4 = new Date(year, 0, 4);
  const start = getWeekStart(jan4);
  start.setDate(start.getDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `Week of ${fmt(start)} – ${fmt(end)}`;
}

export function ensureWeekKey(doc, date = new Date()) {
  const key = getWeekKey(date);
  if (doc.weekly.weekKey === key) return doc;
  return {
    ...doc,
    weekly: {
      ...doc.weekly,
      weekKey: key,
    },
  };
}
