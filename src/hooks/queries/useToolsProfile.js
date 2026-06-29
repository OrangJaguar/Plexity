import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  emptyProfileDocument,
  getOrCreateProfile,
  normalizeProfileDocument,
  saveProfileDocument,
} from '@/api/entities/toolsProfile';
import { queryKeys } from '@/api/query-keys';

export function useToolsProfile() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.tools.profile,
    queryFn: getOrCreateProfile,
    enabled: true,
    placeholderData: emptyProfileDocument,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: saveProfileDocument,
    onMutate: async (doc) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.profile });
      const prev = queryClient.getQueryData(queryKeys.tools.profile);
      queryClient.setQueryData(queryKeys.tools.profile, normalizeProfileDocument(doc));
      return { prev };
    },
    onError: (_err, _doc, ctx) => {
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(queryKeys.tools.profile, ctx.prev);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.profile, normalizeProfileDocument(data));
    },
  });

  const data = normalizeProfileDocument(query.data ?? emptyProfileDocument());

  return {
    data,
    isLoading: query.isLoading,
    saveDocument: saveMutation.mutateAsync,
  };
}
