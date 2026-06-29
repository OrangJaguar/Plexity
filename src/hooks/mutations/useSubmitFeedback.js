import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { submitFeedback } from '@/api/entities/toolsFeedback';

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: submitFeedback,
  });
}
