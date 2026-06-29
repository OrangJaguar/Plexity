import { getWeekKey, getDateKey, isCramMode } from '@/utils/weeklyPlan/weekKey';

/**
 * Determine if a stored weekly plan should be rebuilt.
 */
export function shouldRebuildPlan(journey, now = new Date()) {
  if (!journey?.weeklyPlanSnapshot || !journey.weeklyPlanWeekKey) {
    return true;
  }

  const cram = isCramMode(journey.examDate, now);
  if (cram) {
    return journey.weeklyPlanWeekKey !== getDateKey(now)
      || journey.weeklyPlanMode !== 'cram';
  }

  return journey.weeklyPlanWeekKey !== getWeekKey(now)
    || journey.weeklyPlanMode === 'cram';
}

export function getPlanWeekKey(journey, now = new Date()) {
  if (isCramMode(journey.examDate, now)) {
    return getDateKey(now);
  }
  return getWeekKey(now);
}
