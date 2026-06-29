import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/api/entities/toolsCalendar';
import { queryKeys } from '@/api/query-keys';

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
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ eventId, patch }) => updateEvent(eventId, patch),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEvent,
    onSuccess: invalidate,
  });

  return {
    ...query,
    events: query.data ?? [],
    createEvent: createMutation.mutateAsync,
    updateEvent: (eventId, patch) => updateMutation.mutateAsync({ eventId, patch }),
    deleteEvent: deleteMutation.mutateAsync,
  };
}
