import { ESTIMATED_MIN, FSRS_DAILY_CARD_CAP } from '@/utils/weeklyPlan/constants';
import { assignActivityType } from '@/utils/weeklyPlan/assignActivityType';

export function isWeekendDay(dayIndex) {
  return dayIndex >= 5;
}

/** Mon=0 … Sun=6 — lighter load Sat/Sun. */
export function dayBudgetMinutes(dailyBudgetMin, dayIndex) {
  const base = dailyBudgetMin ?? 35;
  return Math.round(base * (isWeekendDay(dayIndex) ? 0.75 : 1));
}

export function estimateFsrsStudyMinutes(cardCount) {
  if (!cardCount) return 0;
  return Math.min(20, Math.ceil(cardCount * 0.45));
}

export function maxNonFsrsSlotsForDay(dailyBudgetMin, dayIndex, daysUntilExam, moduleCount) {
  const budget = dayBudgetMinutes(dailyBudgetMin, dayIndex);
  const examPressure = daysUntilExam != null && daysUntilExam <= 14 ? 1 : 0;
  const fromBudget = Math.max(1, Math.floor(budget / 18));
  const fromModules = Math.max(1, Math.ceil(moduleCount / 4));
  return Math.min(4, Math.max(fromBudget, fromModules) + examPressure);
}

export function assignmentMinutes(activityType) {
  return ESTIMATED_MIN[activityType] ?? 15;
}

/**
 * Greedy budget-aware pack for one calendar day.
 */
export function packDayAssignments({
  day,
  dayIndex,
  sortedContexts,
  moduleNumberMap,
  dailyBudgetMin,
  daysUntilExam,
}) {
  const budget = dayBudgetMinutes(dailyBudgetMin, dayIndex);
  const fsrsMin = estimateFsrsStudyMinutes(day.fsrsCardCount);
  let remaining = Math.max(0, budget - fsrsMin);
  let maxSlots = maxNonFsrsSlotsForDay(
    dailyBudgetMin,
    dayIndex,
    daysUntilExam,
    sortedContexts.length,
  );

  if (day.fsrsCardCount >= FSRS_DAILY_CARD_CAP * 0.85) {
    maxSlots = Math.min(maxSlots, 1);
    remaining = Math.min(remaining, 20);
  }

  const assignedModules = new Set();
  let passes = 0;
  const maxPasses = Math.max(4, sortedContexts.length);

  while (remaining >= 8 && day.assignments.length < maxSlots && passes < maxPasses) {
    let addedThisPass = false;

    for (const ctx of sortedContexts) {
      if (assignedModules.has(ctx.module.moduleId)) continue;

      const pick = assignActivityType(ctx, dayIndex);
      if (!pick?.activity) continue;

      const cost = assignmentMinutes(pick.activityType);
      if (cost > remaining && day.assignments.length > 0) continue;

      day.assignments.push({
        moduleId: ctx.module.moduleId,
        moduleName: ctx.module.name,
        moduleNumber: moduleNumberMap[ctx.module.moduleId],
        activityId: pick.activity.activityId,
        activityType: pick.activityType,
        reasonCode: pick.reasonCode,
      });

      assignedModules.add(ctx.module.moduleId);
      remaining -= cost;
      addedThisPass = true;

      if (day.assignments.length >= maxSlots) break;
    }

    passes += 1;
    if (!addedThisPass) break;
  }

  const assignMin = day.assignments.reduce(
    (sum, a) => sum + assignmentMinutes(a.activityType),
    0,
  );
  day.estimatedMin = assignMin + fsrsMin;
  day.isRestDay = day.assignments.length === 0 && day.fsrsCardCount === 0;
  day.dayBudgetMin = budget;
}
