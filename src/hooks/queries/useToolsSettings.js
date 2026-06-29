import { useMemo } from 'react';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { mergeToolsSettings } from '@/lib/tools/tools-settings';

export function useToolsSettings() {
  const { data: preferences, isLoading } = usePreferences();
  const settings = useMemo(() => mergeToolsSettings(preferences), [preferences]);
  return { settings, preferences, isLoading };
}
