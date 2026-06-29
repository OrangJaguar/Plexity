import {
  QUIZ_ACCURACY_NEEDS_WORK,
  STAGE_C_PROMOTION_THRESHOLD,
} from '@/utils/weeklyPlan/constants';

const STAGE_URGENCY = { B: 0, A: 1, C: 2 };

function resolveMastery(ctx) {
  if (typeof ctx.module.masteryScore === 'number') return ctx.module.masteryScore;
  if (typeof ctx.quizAccuracy === 'number') return ctx.quizAccuracy;
  return 100;
}

/**
 * Sort modules by urgency: weak mastery, low accuracy, weak concepts, exam proximity, stage.
 */
export function sortModulesByUrgency(contexts, daysUntilExam) {
  return contexts
    .map((ctx) => {
      const mastery = resolveMastery(ctx);
      const accuracy = ctx.quizAccuracy ?? 100;
      const stagePenalty = ctx.stage === 'A' && !ctx.guideComplete ? 5 : STAGE_URGENCY[ctx.stage] ?? 3;
      const masteryUrgency = mastery < 40 ? -200 : mastery < STAGE_C_PROMOTION_THRESHOLD ? -100 : mastery < 85 ? 0 : 40;
      const accuracyUrgency = accuracy < QUIZ_ACCURACY_NEEDS_WORK ? -80 : accuracy < 75 ? -30 : 0;
      const weakConceptBoost = (ctx.weakConceptLabels?.length ?? 0) > 0 ? -60 : 0;
      const examUrgency = daysUntilExam != null ? Math.min(daysUntilExam, 30) : 15;
      const focusBoost = ctx.focusBoost ?? 0;
      const urgencyScore = masteryUrgency + accuracyUrgency + weakConceptBoost
        + examUrgency * 10 + stagePenalty - focusBoost * 50;
      return { ...ctx, urgencyScore };
    })
    .sort((a, b) => a.urgencyScore - b.urgencyScore);
}
