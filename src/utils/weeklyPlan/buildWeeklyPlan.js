import { NORMAL_BUDGET_MIN, CRAM_BUDGET_MIN } from '@/utils/weeklyPlan/constants';
import { isCramMode, getDateKey } from '@/utils/weeklyPlan/weekKey';
import { buildAllModuleContexts } from '@/utils/weeklyPlan/moduleContext';
import { buildNormalWeekPlan } from '@/utils/weeklyPlan/buildNormalWeekPlan';
import { buildCramDayPlan } from '@/utils/weeklyPlan/buildCramDayPlan';
import { getPlanWeekKey } from '@/utils/weeklyPlan/planStale';

/**
 * Build weekly plan snapshot for a journey (pure computation).
 */
export function buildWeeklyPlan({
  journey,
  modules,
  activities,
  sessions,
  cards,
  dailyBudgetMin = NORMAL_BUDGET_MIN,
  now = new Date(),
}) {
  const moduleContexts = buildAllModuleContexts(modules, activities, sessions, journey);
  const cram = isCramMode(journey.examDate, now);
  const budget = cram ? CRAM_BUDGET_MIN : (dailyBudgetMin ?? NORMAL_BUDGET_MIN);

  const snapshot = cram
    ? buildCramDayPlan({
      journey,
      moduleContexts,
      cards,
      dailyBudgetMin: budget,
      now,
    })
    : buildNormalWeekPlan({
      journey,
      moduleContexts,
      cards,
      dailyBudgetMin: budget,
      now,
    });

  return {
    snapshot,
    weekKey: getPlanWeekKey(journey, now),
    mode: cram ? 'cram' : 'normal',
    builtAt: now.getTime(),
  };
}

/**
 * Get today's plan day from a snapshot.
 */
export function getTodayPlanDay(snapshot, now = new Date()) {
  if (!snapshot?.days?.length) return null;
  const todayKey = getDateKey(now);
  return snapshot.days.find((d) => d.dateKey === todayKey)
    ?? snapshot.days.find((d) => !d.isRestDay)
    ?? snapshot.days[0];
}
