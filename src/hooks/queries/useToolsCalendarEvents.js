import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/api/entities/toolsCalendar';
import { queryKeys } from '@/api/query-keys';
import { DEFAULT_EVENT_COLOR } from '@/lib/tools/constants';

function mergeEventPatch(events, eventId, patch) {
  return (events || []).map((evt) => {
    if ((evt.eventId || evt.id) !== eventId) return evt;
    return { ...evt, ...patch, updatedAt: Date.now() };
  });
}

export function useToolsCalendarEvents() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.tools.calendar,
    queryFn: listEvents,
    enabled: true,
    placeholderData: [],
    retry: false,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.calendar });

  const createMutation = useMutation({
    mutationFn: createEvent,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.calendar });
      const prev = queryClient.getQueryData(queryKeys.tools.calendar);
      const now = Date.now();
      const eventId = crypto.randomUUID();
      const optimistic = {
        id: eventId,
        eventId,
        title: payload.title || 'Untitled',
        start: payload.start,
        end: payload.end,
        allDay: payload.allDay ?? false,
        color: payload.color || DEFAULT_EVENT_COLOR,
        repeatRule: payload.repeatRule || 'none',
        repeatIntervalWeeks: payload.repeatIntervalWeeks ?? 1,
        repeatDays: payload.repeatDays || [],
        linkedJourneyIds: payload.linkedJourneyIds || [],
        instanceOverrides: payload.instanceOverrides || [],
        notes: payload.notes || '',
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData(queryKeys.tools.calendar, (old) => [...(old || []), optimistic]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tools.calendar, ctx.prev);
    },
    onSettled: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, patch }) => updateEvent(eventId, patch),
    onMutate: async ({ eventId, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.calendar });
      const prev = queryClient.getQueryData(queryKeys.tools.calendar);
      queryClient.setQueryData(queryKeys.tools.calendar, (old) => mergeEventPatch(old, eventId, patch));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tools.calendar, ctx.prev);
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.calendar });
      const prev = queryClient.getQueryData(queryKeys.tools.calendar);
      queryClient.setQueryData(queryKeys.tools.calendar, (old) =>
        (old || []).filter((evt) => (evt.eventId || evt.id) !== eventId),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tools.calendar, ctx.prev);
    },
    onSettled: invalidate,
  });

  return {
    ...query,
    events: query.data ?? [],
    createEvent: createMutation.mutateAsync,
    updateEvent: (eventId, patch) => updateMutation.mutateAsync({ eventId, patch }),
    deleteEvent: deleteMutation.mutateAsync,
  };
}
