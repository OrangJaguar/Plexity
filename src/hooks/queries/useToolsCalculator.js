import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  emptyCalculatorWorkspace,
  getOrCreateCalculator,
  normalizeCalculatorWorkspace,
  saveCalculatorDocument,
} from '@/api/entities/toolsCalculator';
import { queryKeys } from '@/api/query-keys';
import { useAuth } from '@/hooks/useAuth';

export function useToolsCalculator() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.tools.calculator,
    queryFn: getOrCreateCalculator,
    enabled: isAuthenticated,
    placeholderData: emptyCalculatorWorkspace,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: saveCalculatorDocument,
    onMutate: async (doc) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.calculator });
      const prev = queryClient.getQueryData(queryKeys.tools.calculator);
      queryClient.setQueryData(queryKeys.tools.calculator, normalizeCalculatorWorkspace(doc));
      return { prev };
    },
    onError: (_err, _doc, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.tools.calculator, ctx.prev);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.calculator, data);
    },
  });

  return {
    data: query.data ?? emptyCalculatorWorkspace,
    isLoading: query.isLoading,
    saveDocument: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
