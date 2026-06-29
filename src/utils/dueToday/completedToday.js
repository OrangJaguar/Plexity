import { startOfDay, endOfDay } from 'date-fns';

/**
 * Sessions completed today (local timezone).
 */
export function getCompletedSessionsToday(sessions, now = new Date()) {
  const start = startOfDay(now).getTime();
  const end = endOfDay(now).getTime();
  return sessions.filter(
    (s) => s.status === 'completed' && s.startedAt >= start && s.startedAt <= end,
  );
}

/**
 * Count how many planned items were completed today.
 */
export function countCompletedToday(plannedActivityIds, sessions, now = new Date()) {
  const completed = getCompletedSessionsToday(sessions, now);
  const completedIds = new Set(completed.map((s) => s.activityId));
  let count = 0;
  for (const id of plannedActivityIds) {
    if (completedIds.has(id)) count += 1;
  }
  return count;
}
