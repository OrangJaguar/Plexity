import { getJourney, updateJourney } from '@/api/entities/journeys';
import { listModulesByJourney } from '@/api/entities/modules';
import { listActivitiesByJourney } from '@/api/entities/activities';
import { listSessionsByJourney } from '@/api/entities/sessions';
import { listCardsByJourney } from '@/api/entities/cards';
import { getPreferences } from '@/api/entities/preferences';
import { buildWeeklyPlan } from '@/utils/weeklyPlan/buildWeeklyPlan';
import { shouldRebuildPlan } from '@/utils/weeklyPlan/planStale';
import { NORMAL_BUDGET_MIN } from '@/utils/weeklyPlan/constants';
import { queryKeys } from '@/api/query-keys';

async function loadJourneyPlanInputs(journeyId) {
  const [journey, modules, activities, sessions, cards, preferences] = await Promise.all([
    getJourney(journeyId),
    listModulesByJourney(journeyId),
    listActivitiesByJourney(journeyId),
    listSessionsByJourney(journeyId),
    listCardsByJourney(journeyId),
    getPreferences().catch(() => null),
  ]);

  return {
    journey,
    modules,
    activities,
    sessions,
    cards,
    dailyBudgetMin: preferences?.dailyTimeBudgetMin ?? NORMAL_BUDGET_MIN,
  };
}

/**
 * Recompute and persist weekly plan on Journey record.
 */
export async function rebuildWeeklyPlan(journeyId, { force = false } = {}) {
  const inputs = await loadJourneyPlanInputs(journeyId);
  if (!inputs.journey) throw new Error(`Journey not found: ${journeyId}`);

  if (!force && !shouldRebuildPlan(inputs.journey)) {
    return inputs.journey.weeklyPlanSnapshot;
  }

  const { snapshot, weekKey, mode, builtAt } = buildWeeklyPlan(inputs);

  await updateJourney(journeyId, {
    weeklyPlanSnapshot: snapshot,
    weeklyPlanWeekKey: weekKey,
    weeklyPlanBuiltAt: builtAt,
    weeklyPlanMode: mode,
  });

  return snapshot;
}

/**
 * Return cached plan or rebuild if stale.
 */
export async function ensureWeeklyPlan(journeyId) {
  const journey = await getJourney(journeyId);
  if (!journey) throw new Error(`Journey not found: ${journeyId}`);

  if (!shouldRebuildPlan(journey)) {
    return {
      journey,
      snapshot: journey.weeklyPlanSnapshot,
      mode: journey.weeklyPlanMode ?? 'normal',
      weekKey: journey.weeklyPlanWeekKey,
      builtAt: journey.weeklyPlanBuiltAt,
    };
  }

  const snapshot = await rebuildWeeklyPlan(journeyId, { force: true });
  const updated = await getJourney(journeyId);
  return {
    journey: updated,
    snapshot,
    mode: updated?.weeklyPlanMode ?? 'normal',
    weekKey: updated?.weeklyPlanWeekKey,
    builtAt: updated?.weeklyPlanBuiltAt,
  };
}

export function invalidateWeeklyPlan(queryClient, journeyId) {
  queryClient.invalidateQueries({ queryKey: queryKeys.studyPlan(journeyId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlan(journeyId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.dueToday });
}
