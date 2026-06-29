import { useCallback } from 'react';
import { useLaunchStudy } from '@/hooks/study/useLaunchStudy';
import { getActivity } from '@/api/entities/activities';

const ACTION_VERBS = {
  flashcardSet: 'Review',
  practiceQuiz: 'Start',
  learningGuide: 'Continue',
  feynman: 'Start',
  freeRecall: 'Start',
  interleavedReview: 'Start',
  journeyChallenge: 'Start',
  cramSession: 'Start',
};

export function actionVerbForType(activityType) {
  return ACTION_VERBS[activityType] ?? 'Start';
}

export function useLaunchDueItem() {
  const launchStudy = useLaunchStudy();

  return useCallback(async (item) => {
    const activity = await getActivity(item.activityId);
    if (!activity) return;
    await launchStudy({
      journeyId: item.journeyId,
      activity,
      moduleId: item.moduleId ?? undefined,
    });
  }, [launchStudy]);
}
