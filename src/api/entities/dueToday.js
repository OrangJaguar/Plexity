import { listJourneys } from '@/api/entities/journeys';
import { listAllModules } from '@/api/entities/modules';
import { listAllActivities } from '@/api/entities/activities';
import { listAllCards } from '@/api/entities/cards';
import { listAllSessions } from '@/api/entities/sessions';
import { getPreferences } from '@/api/entities/preferences';
import { ensureWeeklyPlan } from '@/api/entities/weeklyPlan';
import { queryKeys } from '@/api/query-keys';
import { getDueTodayItems } from '@/utils/dueToday/getDueTodayItems';
import { NORMAL_BUDGET_MIN } from '@/utils/weeklyPlan/constants';

/**
 * Build Due Today from shared React Query cache when possible.
 */
export async function fetchDueTodayItems(queryClient) {
  const [journeys, modules, activities, cards, sessions, preferences] = await Promise.all([
    queryClient.ensureQueryData({
      queryKey: queryKeys.journeys.all,
      queryFn: () => listJourneys({ archived: false }),
    }),
    queryClient.ensureQueryData({
      queryKey: queryKeys.catalog.allModules,
      queryFn: listAllModules,
    }),
    queryClient.ensureQueryData({
      queryKey: queryKeys.catalog.allActivities,
      queryFn: listAllActivities,
    }),
    queryClient.ensureQueryData({
      queryKey: queryKeys.catalog.allCards,
      queryFn: listAllCards,
    }),
    queryClient.ensureQueryData({
      queryKey: queryKeys.catalog.allSessions,
      queryFn: listAllSessions,
    }),
    getPreferences().catch(() => null),
  ]);

  const activeJourneys = journeys.filter((j) => !j.archived);
  const weeklyPlansByJourney = {};

  await Promise.all(
    activeJourneys.map(async (j) => {
      try {
        weeklyPlansByJourney[j.journeyId] = await ensureWeeklyPlan(j.journeyId);
      } catch {
        weeklyPlansByJourney[j.journeyId] = {
          snapshot: j.weeklyPlanSnapshot,
          mode: j.weeklyPlanMode,
        };
      }
    }),
  );

  return getDueTodayItems({
    journeys,
    modules,
    activities,
    sessions,
    cards,
    dailyBudgetMin: preferences?.dailyTimeBudgetMin ?? NORMAL_BUDGET_MIN,
    weeklyPlansByJourney,
  });
}
