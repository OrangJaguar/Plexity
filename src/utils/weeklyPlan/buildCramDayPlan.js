import { CRAM_BUDGET_MIN, FSRS_DAILY_CARD_CAP } from '@/utils/weeklyPlan/constants';
import { getDateKey } from '@/utils/weeklyPlan/weekKey';
import { assignActivityType } from '@/utils/weeklyPlan/assignActivityType';
import { buildModuleNumberMap } from '@/utils/weeklyPlan/moduleContext';
import { sortModulesByUrgency } from '@/utils/weeklyPlan/moduleUrgency';
import { buildModuleSummaries } from '@/utils/weeklyPlan/modulePriorityText';
import {
  assignmentMinutes,
  estimateFsrsStudyMinutes,
  maxNonFsrsSlotsForDay,
} from '@/utils/weeklyPlan/planPacking';
import { getDueCards } from '@/utils/fsrs';

/**
 * Cram mode: pack today's plan up to daily budget with highest-urgency modules first.
 */
export function buildCramDayPlan({
  journey,
  moduleContexts,
  cards = [],
  dailyBudgetMin = CRAM_BUDGET_MIN,
  now = new Date(),
}) {
  const dateKey = getDateKey(now);
  const daysUntilExam = journey.examDate
    ? Math.max(0, Math.ceil((journey.examDate - now.getTime()) / 86400000))
    : null;

  const sorted = sortModulesByUrgency(moduleContexts, daysUntilExam);
  const moduleNumberMap = buildModuleNumberMap(moduleContexts.map((ctx) => ctx.module));
  const activeModules = sorted.filter((ctx) => assignActivityType(ctx, 0)?.activity);

  const fsrsCardCount = Math.min(getDueCards(cards).length, FSRS_DAILY_CARD_CAP);
  const fsrsMin = estimateFsrsStudyMinutes(fsrsCardCount);
  let remaining = Math.max(0, dailyBudgetMin - fsrsMin);
  const maxSlots = Math.min(
    activeModules.length,
    maxNonFsrsSlotsForDay(dailyBudgetMin, 0, daysUntilExam, activeModules.length) + 1,
  );

  const assignments = [];
  for (const ctx of activeModules) {
    if (assignments.length >= maxSlots || remaining < 8) break;

    const pick = assignActivityType(ctx, assignments.length);
    if (!pick?.activity) continue;

    const cost = assignmentMinutes(pick.activityType);
    if (cost > remaining && assignments.length > 0) continue;

    assignments.push({
      moduleId: ctx.module.moduleId,
      moduleName: ctx.module.name,
      moduleNumber: moduleNumberMap[ctx.module.moduleId],
      activityId: pick.activity.activityId,
      activityType: pick.activityType,
      reasonCode: pick.reasonCode,
    });
    remaining -= cost;
  }

  const assignMin = assignments.reduce(
    (sum, a) => sum + assignmentMinutes(a.activityType),
    0,
  );

  const day = {
    dayIndex: (now.getDay() + 6) % 7,
    dateKey,
    estimatedMin: assignMin + fsrsMin,
    assignments,
    fsrsCardCount,
    isRestDay: assignments.length === 0 && fsrsCardCount === 0,
    dayBudgetMin: dailyBudgetMin,
  };

  const cramDays = Array.from({ length: 7 }, (_, dayIndex) => ({
    ...day,
    dayIndex,
    dateKey,
    assignments: dayIndex === day.dayIndex ? assignments : [],
    estimatedMin: dayIndex === day.dayIndex ? day.estimatedMin : 0,
    fsrsCardCount: dayIndex === day.dayIndex ? fsrsCardCount : 0,
    isRestDay: dayIndex !== day.dayIndex,
  }));

  return {
    mode: 'cram',
    weekKey: dateKey,
    builtAt: now.getTime(),
    dailyBudgetMin,
    daysUntilExam,
    days: cramDays,
    moduleSummaries: buildModuleSummaries(sorted, [day]),
  };
}
