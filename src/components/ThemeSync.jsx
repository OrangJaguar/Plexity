import { useEffect } from 'react';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { applyThemeFromPreferences } from '@/lib/theme';
import { setStudyFeedbackPrefs } from '@/utils/study/feedback';

export default function ThemeSync() {
  const { data: preferences } = usePreferences();

  useEffect(() => {
    if (!preferences) return;
    applyThemeFromPreferences(preferences);
    setStudyFeedbackPrefs({
      haptics: preferences.haptics !== false,
      audio: preferences.audio !== false,
    });
  }, [preferences]);

  return null;
}
