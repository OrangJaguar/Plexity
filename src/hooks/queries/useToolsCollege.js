import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  emptyCollegeDocument,
  getOrCreateCollege,
  normalizeCollegeDocument,
  saveCollegeDocument,
} from '@/api/entities/toolsCollege';
import { queryKeys } from '@/api/query-keys';
import { useAuth } from '@/hooks/useAuth';

export function useToolsCollege() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.tools.college,
    queryFn: getOrCreateCollege,
    enabled: isAuthenticated,
    placeholderData: emptyCollegeDocument,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: saveCollegeDocument,
    onMutate: async (doc) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.college });
      const prev = queryClient.getQueryData(queryKeys.tools.college);
      queryClient.setQueryData(queryKeys.tools.college, normalizeCollegeDocument(doc));
      return { prev };
    },
    onError: (_err, _doc, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.tools.college, ctx.prev);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.college, normalizeCollegeDocument(data));
    },
  });

  const data = normalizeCollegeDocument(query.data ?? emptyCollegeDocument());

  return {
    data,
    isLoading: query.isLoading,
    saveDocument: saveMutation.mutateAsync,
  };
}
