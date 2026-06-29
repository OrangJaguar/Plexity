import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { movePinnedToolToGap } from '@/lib/tools/pinned-tools';
import {
  applyPinnedToolIds,
  getPinnedIdsFromCache,
  queryKeys,
  syncPinnedToolIdsToServer,
} from '@/lib/tools/persist-pinned-tools';

export function useReorderPinnedTools() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const preferencesKey = queryKeys.preferences(user?.email);

  return useMutation({
    mutationFn: async () => {
      const nextIds = getPinnedIdsFromCache(queryClient, preferencesKey);
      await syncPinnedToolIdsToServer(nextIds);
      return nextIds;
    },
    onMutate: ({ fromIndex, gapIndex }) => {
      const prevIds = getPinnedIdsFromCache(queryClient, preferencesKey);
      const nextIds = movePinnedToolToGap(prevIds, fromIndex, gapIndex);
      applyPinnedToolIds(queryClient, preferencesKey, nextIds);
      return { prevIds, nextIds };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevIds) {
        applyPinnedToolIds(queryClient, preferencesKey, ctx.prevIds);
      }
      toast.error("Couldn't reorder tools");
    },
  });
}
