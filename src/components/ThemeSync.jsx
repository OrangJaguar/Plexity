import { useEffect } from 'react';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { applyThemeFromPreferences } from '@/lib/theme';

export default function ThemeSync() {
  const { data: preferences } = usePreferences();

  useEffect(() => {
    if (!preferences) return;
    applyThemeFromPreferences(preferences);
  }, [preferences]);

  return null;
}
