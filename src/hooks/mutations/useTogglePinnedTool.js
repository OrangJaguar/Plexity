import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { togglePinnedToolId } from '@/lib/tools/pinned-tools';
import {
  applyPinnedToolIds,
  getPinnedIdsFromCache,
  queryKeys,
  syncPinnedToolIdsToServer,
} from '@/lib/tools/persist-pinned-tools';
import { useUiStore } from '@/store/uiStore';

export function useTogglePinnedTool() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const preferencesKey = queryKeys.preferences(user?.email);
  const setLastPinnedToolId = useUiStore((s) => s.setLastPinnedToolId);

  return useMutation({
    mutationFn: async () => {
      const nextIds = getPinnedIdsFromCache(queryClient, preferencesKey);
      await syncPinnedToolIdsToServer(nextIds);
      return nextIds;
    },
    onMutate: (toolId) => {
      const prevIds = getPinnedIdsFromCache(queryClient, preferencesKey);
      const nextIds = togglePinnedToolId(toolId, prevIds);
      if (nextIds.includes(toolId)) {
        setLastPinnedToolId(toolId);
      }
      applyPinnedToolIds(queryClient, preferencesKey, nextIds);
      return { prevIds, nextIds };
    },
    onError: (_err, _toolId, ctx) => {
      if (ctx?.prevIds) {
        applyPinnedToolIds(queryClient, preferencesKey, ctx.prevIds);
      }
      toast.error("Couldn't sync pinned tools — saved on this device");
    },
  });
}
