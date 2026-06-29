import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { updatePreferences } from '@/api/entities/preferences';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  isToolsSettingsPatch,
  writeToolsSettingsToStorage,
} from '@/lib/tools/persist-tools-settings';

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const preferencesKey = queryKeys.preferences(user?.email);

  return useMutation({
    mutationFn: (patch) => updatePreferences(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: preferencesKey });
      const prev = queryClient.getQueryData(preferencesKey);
      if (isToolsSettingsPatch(patch)) {
        writeToolsSettingsToStorage(patch);
      }
      queryClient.setQueryData(preferencesKey, (old) => (
        old ? { ...old, ...patch } : old
      ));
      return { prev, toolsPatch: isToolsSettingsPatch(patch) };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.toolsPatch) {
        toast.error("Couldn't sync to cloud — saved on this device");
        return;
      }
      if (ctx?.prev !== undefined) {
        queryClient.setQueryData(preferencesKey, ctx.prev);
      }
      toast.error("Changes couldn't be saved");
    },
    onSettled: (_data, _error, patch) => {
      if (isToolsSettingsPatch(patch)) return;
      queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });
}
