import { DAY_LABELS } from '@/utils/weeklyPlan/constants';

function formatAssignedDays(indexes) {
  if (!indexes?.length) return 'this week';
  const labels = indexes.map((i) => DAY_LABELS[i] ?? `Day ${i + 1}`);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

function activityLabelForType(type) {
  const map = {
    feynman: 'Feynman',
    freeRecall: 'Free Recall',
    practiceQuiz: 'quiz',
    flashcardSet: 'flashcard review',
    learningGuide: 'learning guide',
  };
  return map[type] ?? type;
}

/**
 * Build computed priority line for journey detail (no AI).
 */
export function buildModulePriorityText(ctx, assignedDayIndexes = []) {
  const { stage, guideComplete, guideInProgress, quizAccuracy, weakConceptLabels } = ctx;
  const days = formatAssignedDays(assignedDayIndexes);
  const weak = weakConceptLabels[0];

  if (stage === 'A' && !guideComplete && !guideInProgress) {
    return 'Start the learning guide — nothing else unlocks until it\'s complete';
  }
  if (stage === 'A' && guideInProgress) {
    return 'Finish the learning guide, then your first quiz unlocks';
  }

  if (stage === 'B') {
    const accuracy = quizAccuracy ?? 50;
    if (accuracy > 75) {
      return `On track — quiz ${days} this week`;
    }
    if (accuracy >= 50) {
      const focus = weak ? `, focus on ${weak}` : '';
      return `Needs work — quiz ${days}${focus}`;
    }
    const focus = weak ? `, ${weak} needs review` : '';
    return `Struggling — daily quiz this week${focus}`;
  }

  if (stage === 'C') {
    const assignment = assignedDayIndexes.length ? days : 'later this week';
    const act = activityLabelForType(
      assignedDayIndexes.length % 2 === 0 ? 'feynman' : 'freeRecall',
    );
    return `Mastery phase — ${act} scheduled ${assignment}`;
  }

  return 'Keep building mastery this week';
}

export function buildModuleSummaries(sortedContexts, days) {
  const dayIndexMap = {};
  days.forEach((day) => {
    day.assignments.forEach((a) => {
      if (!dayIndexMap[a.moduleId]) dayIndexMap[a.moduleId] = [];
      if (!dayIndexMap[a.moduleId].includes(day.dayIndex)) {
        dayIndexMap[a.moduleId].push(day.dayIndex);
      }
    });
  });

  return sortedContexts.map((ctx) => ({
    moduleId: ctx.module.moduleId,
    moduleName: ctx.module.name,
    priorityText: buildModulePriorityText(ctx, dayIndexMap[ctx.module.moduleId] ?? []),
    assignedDayIndexes: dayIndexMap[ctx.module.moduleId] ?? [],
    weakConceptLabels: ctx.weakConceptLabels,
  }));
}
