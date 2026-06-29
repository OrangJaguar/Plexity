/**
 * Pick activity type for a module given stage and performance data.
 * Stage A + incomplete guide → learningGuide only (hard gate).
 */
export function assignActivityType(ctx, dayIndex = 0) {
  const { stage, guideComplete, quizAccuracy, daysSinceLastQuiz } = ctx;

  if (stage === 'A' && !guideComplete) {
    if (!ctx.learningGuideActivity) return null;
    return {
      activity: ctx.learningGuideActivity,
      activityType: 'learningGuide',
      reasonCode: ctx.guideInProgress ? 'guide_in_progress' : 'guide_not_started',
    };
  }

  if (stage === 'B') {
    const accuracy = quizAccuracy ?? 50;
    const daysSince = daysSinceLastQuiz ?? 99;
    const hasWeakConcepts = (ctx.weakConceptLabels?.length ?? 0) > 0;
    const preferQuiz = accuracy < 75 || daysSince >= 3 || hasWeakConcepts;
    if (preferQuiz && ctx.practiceQuizActivity) {
      return {
        activity: ctx.practiceQuizActivity,
        activityType: 'practiceQuiz',
        reasonCode: hasWeakConcepts
          ? 'weak_concepts'
          : accuracy < 50
            ? 'struggling_quiz'
            : 'scheduled_quiz',
      };
    }
    if (ctx.flashcardActivity) {
      return {
        activity: ctx.flashcardActivity,
        activityType: 'flashcardSet',
        reasonCode: 'flashcard_review',
      };
    }
    if (ctx.practiceQuizActivity) {
      return {
        activity: ctx.practiceQuizActivity,
        activityType: 'practiceQuiz',
        reasonCode: 'fallback_quiz',
      };
    }
  }

  if (stage === 'C') {
    const useFeynman = dayIndex % 2 === 0;
    if (useFeynman && ctx.feynmanActivity) {
      return {
        activity: ctx.feynmanActivity,
        activityType: 'feynman',
        reasonCode: 'mastery_feynman',
      };
    }
    if (ctx.freeRecallActivity) {
      return {
        activity: ctx.freeRecallActivity,
        activityType: 'freeRecall',
        reasonCode: 'mastery_free_recall',
      };
    }
    if (ctx.feynmanActivity) {
      return {
        activity: ctx.feynmanActivity,
        activityType: 'feynman',
        reasonCode: 'mastery_feynman',
      };
    }
  }

  return null;
}
