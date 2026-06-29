import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  emptyGoalsDocument,
  getOrCreateGoals,
  normalizeGoalsDocument,
  saveGoalsDocument,
} from '@/api/entities/toolsGoals';
import { queryKeys } from '@/api/query-keys';
import { useAuth } from '@/hooks/useAuth';

export function useToolsGoals() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.tools.goals,
    queryFn: getOrCreateGoals,
    enabled: isAuthenticated,
    placeholderData: emptyGoalsDocument,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: saveGoalsDocument,
    onMutate: async (doc) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.goals });
      const prev = queryClient.getQueryData(queryKeys.tools.goals);
      queryClient.setQueryData(queryKeys.tools.goals, normalizeGoalsDocument(doc));
      return { prev };
    },
    onError: (_err, _doc, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.tools.goals, ctx.prev);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.goals, normalizeGoalsDocument(data));
    },
  });

  const data = normalizeGoalsDocument(query.data ?? emptyGoalsDocument());

  return {
    data,
    isLoading: query.isLoading,
    saveDocument: saveMutation.mutateAsync,
  };
}
