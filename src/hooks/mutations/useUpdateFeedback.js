import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateFeedback } from '@/api/entities/toolsFeedback';

export function useUpdateFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }) => updateFeedback(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
    },
  });
}
