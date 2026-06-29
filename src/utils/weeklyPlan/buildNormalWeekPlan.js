import { addDays } from 'date-fns';
import { FSRS_DAILY_CARD_CAP, NORMAL_BUDGET_MIN } from '@/utils/weeklyPlan/constants';
import { getMondayStart, getWeekDayKeys, getWeekKey } from '@/utils/weeklyPlan/weekKey';
import { assignActivityType } from '@/utils/weeklyPlan/assignActivityType';
import { buildModuleNumberMap } from '@/utils/weeklyPlan/moduleContext';
import { sortModulesByUrgency } from '@/utils/weeklyPlan/moduleUrgency';
import { buildModuleSummaries } from '@/utils/weeklyPlan/modulePriorityText';
import { packDayAssignments } from '@/utils/weeklyPlan/planPacking';
import { getDueCards } from '@/utils/fsrs';

function countFsrsForDay(cards, dayDate) {
  const end = new Date(dayDate);
  end.setHours(23, 59, 59, 999);
  return getDueCards(cards, end.getTime()).length;
}

/**
 * Build 7-day plan with budget-aware packing, weekend weighting, and FSRS load awareness.
 */
export function buildNormalWeekPlan({
  journey,
  moduleContexts,
  cards = [],
  dailyBudgetMin = NORMAL_BUDGET_MIN,
  now = new Date(),
}) {
  const monday = getMondayStart(now);
  const dateKeys = getWeekDayKeys(monday);
  const daysUntilExam = journey.examDate
    ? Math.max(0, Math.ceil((journey.examDate - now.getTime()) / 86400000))
    : null;

  const sorted = sortModulesByUrgency(moduleContexts, daysUntilExam);
  const moduleNumberMap = buildModuleNumberMap(moduleContexts.map((ctx) => ctx.module));
  const activeModules = sorted.filter((ctx) => {
    if (ctx.stage === 'A' && !ctx.learningGuideActivity && !ctx.guideComplete) return false;
    return assignActivityType(ctx, 0) != null || (ctx.stage === 'A' && ctx.learningGuideActivity);
  });

  const days = dateKeys.map((dateKey, dayIndex) => {
    const dayDate = addDays(monday, dayIndex);
    const fsrsCardCount = countFsrsForDay(cards, dayDate);
    return {
      dayIndex,
      dateKey,
      estimatedMin: 0,
      assignments: [],
      fsrsCardCount: Math.min(fsrsCardCount, FSRS_DAILY_CARD_CAP),
      isRestDay: false,
    };
  });

  if (activeModules.length === 0) {
    days.forEach((d) => { d.isRestDay = true; });
    return {
      mode: 'normal',
      weekKey: getWeekKey(monday),
      builtAt: now.getTime(),
      dailyBudgetMin,
      daysUntilExam,
      days,
      moduleSummaries: [],
    };
  }

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    packDayAssignments({
      day: days[dayIndex],
      dayIndex,
      sortedContexts: activeModules,
      moduleNumberMap,
      dailyBudgetMin,
      daysUntilExam,
    });
  }

  const moduleSummaries = buildModuleSummaries(sorted, days);

  return {
    mode: 'normal',
    weekKey: getWeekKey(monday),
    builtAt: now.getTime(),
    dailyBudgetMin,
    daysUntilExam,
    days,
    moduleSummaries,
  };
}
