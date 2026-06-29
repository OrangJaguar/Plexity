import { ACTIVITY_LABELS, ESTIMATED_MIN } from '@/utils/weeklyPlan/constants';
import { getTodayPlanDay } from '@/utils/weeklyPlan/buildWeeklyPlan';
import { daysUntilExam, getDateKey } from '@/utils/weeklyPlan/weekKey';
import { selectCardsForToday } from '@/utils/fsrs/dueTodaySchedule';
import { ensureWeeklyPlan } from '@/api/entities/weeklyPlan';

const URGENCY_ORDER = { high: 0, medium: 1, low: 2 };

function moduleHref(journeyId, moduleId) {
  return moduleId
    ? `/journeys/${journeyId}/modules/${moduleId}`
    : `/journeys/${journeyId}`;
}

function buildAssignmentItem(journey, assignment, urgencyDays, tier = 'primary') {
  const activityType = assignment.activityType;
  const estimatedMin = ESTIMATED_MIN[activityType] ?? 15;

  return {
    id: `${journey.journeyId}-${assignment.activityId}`,
    journeyId: journey.journeyId,
    journeyTitle: journey.title,
    subject: journey.subject,
    moduleId: assignment.moduleId,
    moduleName: assignment.moduleName,
    activityId: assignment.activityId,
    activityType,
    activityLabel: ACTIVITY_LABELS[activityType] ?? activityType,
    reason: assignment.reasonCode,
    actionLabel: `${ACTIVITY_LABELS[activityType] ?? activityType} — ${assignment.moduleName}`,
    urgency: tier === 'focus' ? 'high' : 'medium',
    urgencyDays,
    estimatedMin,
    href: moduleHref(journey.journeyId, assignment.moduleId),
    tier,
    planAssignment: true,
    isCombinedFsrsDeck: false,
    lastStudiedAt: journey.lastStudiedAt ?? 0,
  };
}

function buildFsrsItem(journey, todayCards, urgencyDays) {
  const cardCount = todayCards.length;
  const estimatedMin = Math.max(5, Math.ceil(cardCount * 0.5));

  const byActivity = {};
  todayCards.forEach((c) => {
    byActivity[c.activityId] = (byActivity[c.activityId] ?? 0) + 1;
  });
  const primaryActivityId = Object.entries(byActivity)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? `fsrs-${journey.journeyId}`;

  return {
    id: `${journey.journeyId}-fsrs-combined`,
    journeyId: journey.journeyId,
    journeyTitle: journey.title,
    subject: journey.subject,
    moduleId: null,
    moduleName: null,
    activityId: primaryActivityId,
    activityType: 'flashcardSet',
    activityLabel: ACTIVITY_LABELS.flashcardSet,
    reason: 'FSRS cards due today',
    actionLabel: `${cardCount} card${cardCount === 1 ? '' : 's'} due for review`,
    urgency: 'high',
    urgencyDays,
    estimatedMin,
    href: `/journeys/${journey.journeyId}`,
    cardCount,
    cardIds: todayCards.map((c) => c.cardId),
    tier: 'fsrs',
    planAssignment: false,
    isCombinedFsrsDeck: true,
    lastStudiedAt: journey.lastStudiedAt ?? 0,
  };
}

function applyBudgetTiers(items, budgetMin) {
  let accumulated = 0;
  let focusSet = false;

  return items.map((item) => {
    const next = { ...item };
    if (!focusSet && (item.tier === 'primary' || item.tier === 'fsrs')) {
      next.tier = 'focus';
      focusSet = true;
    }
    accumulated += item.estimatedMin;
    if (accumulated > budgetMin && next.tier !== 'focus') {
      next.tier = 'overflow';
    }
    return next;
  });
}

/**
 * Build Due Today from persisted weekly plans + FSRS budget layer.
 */
export async function getDueTodayItems({
  journeys,
  modules,
  activities,
  sessions,
  cards,
  dailyBudgetMin = 35,
  weeklyPlansByJourney = {},
}) {
  const activeJourneys = journeys.filter((j) => !j.archived);
  const allItems = [];

  for (const journey of activeJourneys) {
    const journeyId = journey.journeyId;
    let planData = weeklyPlansByJourney[journeyId];

    if (!planData?.snapshot) {
      try {
        planData = await ensureWeeklyPlan(journeyId);
      } catch {
        continue;
      }
    }

    const snapshot = planData.snapshot ?? journey.weeklyPlanSnapshot;
    if (!snapshot) continue;

    const urgencyDays = daysUntilExam(journey.examDate) ?? 999;
    const todayDay = getTodayPlanDay(snapshot);
    const journeyCards = cards.filter((c) => c.journeyId === journeyId);

    const { todayCards } = selectCardsForToday(journeyCards, {
      dateKey: getDateKey(),
    });

    const assignments = todayDay?.assignments ?? [];
    const isCram = snapshot.mode === 'cram';

    for (const assignment of assignments) {
      allItems.push(buildAssignmentItem(journey, assignment, urgencyDays, 'primary'));
    }

    if (todayCards.length > 0) {
      allItems.push(buildFsrsItem(journey, todayCards, urgencyDays));
    }

    if (isCram && assignments.length === 0 && todayCards.length === 0) {
      // cram: still show if modules exist but nothing due
    }
  }

  const sorted = [...allItems].sort((a, b) => {
    const urg = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urg !== 0) return urg;
    return (a.urgencyDays ?? 999) - (b.urgencyDays ?? 999);
  });

  return applyBudgetTiers(sorted, dailyBudgetMin);
}

export function sortByGlobalUrgency(items) {
  return [...items].sort((a, b) => {
    const urg = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urg !== 0) return urg;
    return (a.urgencyDays ?? 999) - (b.urgencyDays ?? 999);
  });
}
