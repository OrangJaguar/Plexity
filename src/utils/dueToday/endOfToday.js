/** End of local calendar day in ms (for due-date comparisons). */
export function endOfTodayMs() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/** Start of tomorrow local midnight in ms. */
export function startOfTomorrowMs() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
