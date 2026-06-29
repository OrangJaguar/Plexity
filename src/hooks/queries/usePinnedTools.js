import { useMemo } from 'react';
import { usePreferences } from '@/hooks/queries/usePreferences';
import {
  getDefaultPinnedToolIds,
  sanitizePinnedToolIds,
} from '@/lib/tools/pinned-tools';
import { getToolsByIds } from '@/lib/tools/registry';

export function usePinnedTools() {
  const { data: preferences, isLoading, isError } = usePreferences();

  const pinnedToolIds = useMemo(() => {
    const fromCache = sanitizePinnedToolIds(preferences?.pinnedToolIds);
    if (fromCache !== null) return fromCache;
    return getDefaultPinnedToolIds();
  }, [preferences?.pinnedToolIds]);

  const pinnedTools = useMemo(
    () => getToolsByIds(pinnedToolIds),
    [pinnedToolIds],
  );

  return {
    pinnedToolIds,
    pinnedTools,
    isLoading,
    isError,
  };
}
