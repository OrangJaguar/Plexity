import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  emptyListsWorkspace,
  getOrCreateLists,
  normalizeListsWorkspace,
  saveListsDocument,
} from '@/api/entities/toolsLists';
import { queryKeys } from '@/api/query-keys';

export function useToolsLists() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.tools.lists,
    queryFn: getOrCreateLists,
    enabled: true,
    placeholderData: emptyListsWorkspace,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: saveListsDocument,
    onMutate: async (doc) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.lists });
      const prev = queryClient.getQueryData(queryKeys.tools.lists);
      queryClient.setQueryData(queryKeys.tools.lists, normalizeListsWorkspace(doc));
      return { prev };
    },
    onError: (_err, _doc, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.tools.lists, ctx.prev);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.lists, normalizeListsWorkspace(data));
    },
  });

  const data = normalizeListsWorkspace(query.data ?? emptyListsWorkspace());

  return {
    data,
    isLoading: query.isLoading,
    saveDocument: saveMutation.mutateAsync,
  };
}
