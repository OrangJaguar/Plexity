import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { createSession, updateSession, deleteSession } from '@/api/entities/sessions';
import { generateSessionId } from '@/utils/schemas/ids';
import { createSessionSchema } from '@/utils/schemas/session';

export function useCreateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ journeyId, input }) => {
      const parsed = createSessionSchema.parse(input);
      return createSession(journeyId, {
        sessionId: generateSessionId(),
        ...parsed,
      });
    },
    onSuccess: (_, { journeyId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byJourney(journeyId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.journeys.detail(journeyId) });
    },
  });
}

export function useUpdateSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, journeyId, patch }) => updateSession(sessionId, patch),
    onSuccess: (_, { journeyId, skipInvalidate }) => {
      if (skipInvalidate) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byJourney(journeyId) });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, journeyId }) => deleteSession(sessionId),
    onSuccess: (_, { journeyId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.byJourney(journeyId) });
    },
  });
}
