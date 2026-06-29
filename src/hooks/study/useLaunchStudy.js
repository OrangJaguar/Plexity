import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateSession } from '@/hooks/mutations/useSessionMutations';
import { queryKeys } from '@/api/query-keys';
import { listSessionsByJourney } from '@/api/entities/sessions';
import { updateActivity } from '@/api/entities/activities';
import { isLearningGuideComplete } from '@/utils/study/activityContent';
import { getModule } from '@/api/entities/modules';
import { moduleNeedsBaseline } from '@/utils/research/baselineCheck';

/**
 * Create an in-progress session and navigate to the study shell.
 * Resumes an existing in-progress session for the same activity when present.
 */
export function useLaunchStudy() {
  const navigate = useNavigate();
  const createSession = useCreateSession();
  const queryClient = useQueryClient();

  return useCallback(
    async ({ journeyId, activity, moduleId = null, initialSessionData = {}, forceNew = false }) => {
      const resolvedModuleId = moduleId ?? activity.moduleId ?? null;

      if (
        resolvedModuleId
        && activity.type !== 'baselineCheck'
      ) {
        let mod = null;
        const cachedModules = queryClient.getQueryData(queryKeys.modules.byJourney(journeyId));
        if (Array.isArray(cachedModules)) {
          mod = cachedModules.find((m) => m.moduleId === resolvedModuleId);
        }
        if (!mod) {
          try {
            mod = await getModule(resolvedModuleId);
          } catch {
            mod = null;
          }
        }
        if (moduleNeedsBaseline(mod)) {
          navigate(`/journeys/${journeyId}/modules/${resolvedModuleId}/baseline`);
          return null;
        }
      }

      const isGuideRedo = activity.type === 'learningGuide' && isLearningGuideComplete(activity);
      const skipResume = forceNew || isGuideRedo;

      let sessions = queryClient.getQueryData(queryKeys.sessions.byJourney(journeyId));
      if (!Array.isArray(sessions)) {
        try {
          sessions = await listSessionsByJourney(journeyId);
          queryClient.setQueryData(queryKeys.sessions.byJourney(journeyId), sessions);
        } catch {
          sessions = [];
        }
      }

      if (!skipResume) {
        const existing = sessions.find(
          (s) => s.activityId === activity.activityId && s.status === 'in_progress',
        );
        if (existing?.sessionId) {
          navigate(`/study/${existing.sessionId}`);
          return existing;
        }
      }

      let sessionData = initialSessionData;
      let launchActivity = activity;

      if (isGuideRedo && activity.content?.sections?.length) {
        const resetContent = {
          ...activity.content,
          progress: {
            completedSectionIds: [],
            currentSectionIndex: 0,
            checkInBySection: {},
          },
        };
        sessionData = {
          ...initialSessionData,
          currentSectionIndex: 0,
          completedSectionIds: [],
          checkInBySection: {},
          redo: true,
        };
        launchActivity = { ...activity, content: resetContent };
        await updateActivity(activity.activityId, { content: resetContent });
        queryClient.invalidateQueries({
          queryKey: queryKeys.activities.byModule(moduleId ?? activity.moduleId),
        });
      }

      const session = await createSession.mutateAsync({
        journeyId,
        input: {
          activityId: activity.activityId,
          activityType: activity.type,
          moduleId: moduleId ?? activity.moduleId ?? undefined,
          startedAt: Date.now(),
          status: 'in_progress',
          sessionData,
        },
      });
      const sid = session.sessionId ?? session.id;
      queryClient.setQueryData(['sessions', 'detail', sid], {
        ...session,
        sessionData,
      });
      queryClient.setQueryData(
        queryKeys.activities.byModule(moduleId ?? activity.moduleId),
        (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((a) => (
            a.activityId === activity.activityId ? launchActivity : a
          ));
        },
      );
      navigate(`/study/${sid}`);
      return session;
    },
    [createSession, navigate, queryClient],
  );
}
