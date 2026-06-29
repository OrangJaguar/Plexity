import { useMemo, useState } from 'react';
import ScheduleEditor from '@/components/tools/settings/ScheduleEditor';
import DashboardWidgetsEditor from '@/components/tools/settings/DashboardWidgetsEditor';
import { useToolsSettings } from '@/hooks/queries/useToolsSettings';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useUpdatePreferences } from '@/hooks/mutations/usePreferencesMutations';
import { applyThemeFromPreferences, persistThemeToStorage } from '@/lib/theme';
import VeridianSwitch from '@/components/shared/form/VeridianSwitch';
import VeridianCheckbox from '@/components/shared/form/VeridianCheckbox';
import { JOURNAL_PROMPTS, JOURNAL_PRESET_TAGS, TOOLS_SETTINGS_DEFAULTS } from '@/lib/tools/tools-settings';
import {
  DEFAULT_WIDGET_LAYOUT,
  mergeWidgetLayout,
  syncWidgetsFromLayout,
  normalizeWidgetLayout,
  MAX_DASHBOARD_WIDGETS,
  HABIT_LABEL_MAX,
} from '@/lib/tools/widget-layout';

export default function ToolsSettingsContent() {
  const { settings } = useToolsSettings();
  const { data: preferences } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const [newTag, setNewTag] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const themeDark = preferences?.themeDark !== false;
  const widgetLayout = useMemo(() => mergeWidgetLayout(preferences), [preferences]);

  const journalTags = settings.toolsJournalTags ?? JOURNAL_PRESET_TAGS;
  const customCategories = settings.toolsCustomCategories || [];
  const habitDefs = settings.toolsHabitDefinitions || [];

  const handleThemeToggle = (next) => {
    persistThemeToStorage(next);
    applyThemeFromPreferences({ themeDark: next });
    updatePrefs.mutate({ themeDark: next });
  };

  const saveLayout = (layout) => {
    const normalized = normalizeWidgetLayout(layout);
    updatePrefs.mutate({
      toolsDashboardWidgetLayout: normalized,
      toolsDashboardWidgets: syncWidgetsFromLayout(normalized),
    });
  };

  const addJournalTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (!tag || journalTags.includes(tag)) return;
    updatePrefs.mutate({ toolsJournalTags: [...journalTags, tag] });
    setNewTag('');
  };

  const removeJournalTag = (tag) => {
    updatePrefs.mutate({ toolsJournalTags: journalTags.filter((t) => t !== tag) });
  };

  const addCategory = () => {
    const cat = newCategory.trim();
    if (!cat || customCategories.includes(cat)) return;
    updatePrefs.mutate({ toolsCustomCategories: [...customCategories, cat] });
    setNewCategory('');
  };

  const removeCategory = (cat) => {
    updatePrefs.mutate({ toolsCustomCategories: customCategories.filter((c) => c !== cat) });
  };

  const addHabit = (label) => {
    const trimmed = (label ?? newHabit).trim().slice(0, HABIT_LABEL_MAX);
    if (!trimmed) return;
    updatePrefs.mutate({
      toolsHabitDefinitions: [...habitDefs, { id: crypto.randomUUID(), label: trimmed }],
    });
    setNewHabit('');
  };

  const removeHabit = (id) => {
    updatePrefs.mutate({
      toolsHabitDefinitions: habitDefs.filter((h) => h.id !== id),
    });
  };

  return (
    <div className="tools-settings-page">
      <header className="tools-settings-page-header">
        <h1>Tools Settings</h1>
      </header>

      <section className="tools-settings-section tools-settings-theme-box">
        <div className="tools-settings-theme-row">
          <span className="tools-settings-theme-label">{themeDark ? 'Dark' : 'Light'}</span>
          <VeridianSwitch
            checked={themeDark}
            onChange={handleThemeToggle}
            disabled={updatePrefs.isPending}
            aria-label={themeDark ? 'Switch to light mode' : 'Switch to dark mode'}
          />
        </div>
      </section>

      <ScheduleEditor />

      <section className="tools-settings-section">
        <div className="tools-settings-section-heading-row">
          <h2>Dashboard widgets</h2>
          <span className="tools-settings-max-badge">Maximum {MAX_DASHBOARD_WIDGETS}</span>
        </div>
        <p className="tools-settings-lead tools-settings-lead--spaced">
          Pick up to two compact widgets for your dashboard summary line. Reorder to set priority.
        </p>
        <DashboardWidgetsEditor
          layout={widgetLayout.length ? widgetLayout : DEFAULT_WIDGET_LAYOUT}
          settings={settings}
          onLayoutChange={saveLayout}
          onWeatherLocation={(loc) => updatePrefs.mutate({
            toolsWeatherLocation: loc,
            toolsWeatherCity: loc?.label || loc?.name || '',
          })}
          onWeatherUnit={(unit) => updatePrefs.mutate({ toolsWeatherUnit: unit })}
          onStockSymbols={(symbols) => updatePrefs.mutate({ toolsStockSymbols: symbols })}
          habitDefs={habitDefs}
          onAddHabit={addHabit}
          onRemoveHabit={removeHabit}
          newHabit={newHabit}
          setNewHabit={setNewHabit}
        />
      </section>

      <section className="tools-settings-section tools-settings-card">
        <h2>Journal</h2>

        <div className="tools-settings-field-stack">
          <label className="tools-settings-field">
            <span className="tools-settings-label">Minimum words for streak</span>
            <select
              className="tools-settings-input"
              value={settings.journalMinWords ?? 50}
              onChange={(e) => updatePrefs.mutate({ journalMinWords: Number(e.target.value) })}
            >
              <option value={0}>Any entry</option>
              <option value={50}>50 words</option>
              <option value={100}>100 words</option>
              <option value={200}>200 words</option>
            </select>
          </label>

          <div className="tools-settings-check-block">
            <VeridianCheckbox
              className="settings-veridian-check"
              checked={Boolean(settings.journalDailyPromptEnabled)}
              onChange={(e) => updatePrefs.mutate({ journalDailyPromptEnabled: e.target.checked })}
            >
              Show daily writing prompt
            </VeridianCheckbox>
            <p className="tools-settings-hint">Sample: {JOURNAL_PROMPTS[0]}</p>
          </div>
        </div>

        <div className="tools-settings-subsection">
          <h3>Journal tags</h3>
          <p className="tools-settings-hint">Use these with # in entries. Remove any you don&apos;t need.</p>
          <div className="tools-category-chips">
            {journalTags.map((tag) => (
              <span key={tag} className="tools-category-chip">
                #{tag}
                <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeJournalTag(tag)}>×</button>
              </span>
            ))}
          </div>
          <div className="tools-settings-inline-add">
            <input
              className="tools-settings-input"
              type="text"
              placeholder="Add tag"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addJournalTag(); } }}
            />
            <button type="button" className="btn btn-sm" onClick={addJournalTag}>Add</button>
          </div>
        </div>

        <div className="tools-settings-subsection">
          <h3>Task categories</h3>
          <p className="tools-settings-hint">Custom categories appear when creating tasks.</p>
          <div className="tools-category-chips">
            {customCategories.map((cat) => (
              <span key={cat} className="tools-category-chip">
                {cat}
                <button type="button" aria-label={`Remove ${cat}`} onClick={() => removeCategory(cat)}>×</button>
              </span>
            ))}
          </div>
          <div className="tools-settings-inline-add">
            <input
              className="tools-settings-input"
              type="text"
              placeholder="Add category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
            />
            <button type="button" className="btn btn-sm" onClick={addCategory}>Add</button>
          </div>
        </div>
      </section>

      <section className="tools-settings-section tools-settings-card">
        <h2>Focus</h2>
        <p className="tools-settings-hint tools-settings-status-line">
          Last preset: <strong>{settings.focusLastPreset || TOOLS_SETTINGS_DEFAULTS.focusLastPreset}</strong>
          {' '}— saved when you start a session
        </p>
        <label className="tools-settings-field">
          <span className="tools-settings-label">Default ambient sound</span>
          <select
            className="tools-settings-input"
            value={settings.focusAmbientSound || 'off'}
            onChange={(e) => updatePrefs.mutate({ focusAmbientSound: e.target.value })}
          >
            <option value="off">Off</option>
            <option value="rain">Rain</option>
            <option value="brown">Brown noise</option>
            <option value="white">White noise</option>
            <option value="cafe">Café</option>
            <option value="forest">Forest</option>
            <option value="space">Space</option>
          </select>
        </label>
      </section>
    </div>
  );
}
