import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import ScheduleEditor from '@/components/tools/settings/ScheduleEditor';
import DashboardWidgetsEditor from '@/components/tools/settings/DashboardWidgetsEditor';
import { useToolsSettings } from '@/hooks/queries/useToolsSettings';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useUpdatePreferences } from '@/hooks/mutations/usePreferencesMutations';
import { applyThemeFromPreferences, persistThemeToStorage } from '@/lib/theme';
import AppSwitch from '@/components/shared/form/AppSwitch';
import AppCheckbox from '@/components/shared/form/AppCheckbox';
import { JOURNAL_PROMPTS, JOURNAL_PRESET_TAGS, TOOLS_SETTINGS_DEFAULTS } from '@/lib/tools/tools-settings';
import {
  DEFAULT_WIDGET_LAYOUT,
  mergeWidgetLayout,
  syncWidgetsFromLayout,
  normalizeWidgetLayout,
  MAX_DASHBOARD_WIDGETS,
  HABIT_LABEL_MAX,
} from '@/lib/tools/widget-layout';

/** @typedef {{ id: string, title: string, keywords: string[], render: () => import('react').ReactNode }} SettingsToolSection */

function SettingsTitleBox({ id, title, badge = null }) {
  return (
    <div className="tools-settings-title-box" aria-labelledby={id}>
      <div className="tools-settings-title-box-row">
        <h2 id={id}>{title}</h2>
        {badge}
      </div>
    </div>
  );
}

export default function ToolsSettingsContent() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings } = useToolsSettings();
  const { data: preferences } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const [newTag, setNewTag] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [toolQuery, setToolQuery] = useState('');

  const themeDark = preferences?.themeDark !== false;
  const widgetLayout = useMemo(() => mergeWidgetLayout(preferences), [preferences]);
  const journalTags = settings.toolsJournalTags ?? JOURNAL_PRESET_TAGS;
  const customCategories = settings.toolsCustomCategories || [];
  const habitDefs = settings.toolsHabitDefinitions || [];
  const email = user?.email || preferences?.userEmail || '';

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

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  /** @type {SettingsToolSection[]} */
  const toolSections = useMemo(() => [
    {
      id: 'calendar',
      title: 'Calendar',
      keywords: ['calendar', 'schedule', 'class', 'recurring', 'weekly'],
      render: () => (
        <section className="tools-settings-block" aria-labelledby="settings-calendar-heading">
          <SettingsTitleBox
            id="settings-calendar-heading"
            title="Calendar"
          />
          <div className="tools-settings-section tools-settings-body-box">
            <ScheduleEditor />
          </div>
        </section>
      ),
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      keywords: ['dashboard', 'widgets', 'weather', 'stocks', 'habits', 'quote', 'sleep', 'travel', 'buffer'],
      render: () => (
        <section className="tools-settings-block" aria-labelledby="settings-dashboard-heading">
          <SettingsTitleBox
            id="settings-dashboard-heading"
            title="Dashboard"
            badge={<span className="tools-settings-max-badge">Maximum {MAX_DASHBOARD_WIDGETS}</span>}
          />
          <div className="tools-settings-section tools-settings-body-box">
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
            <div className="tools-settings-subsection">
              <h3>Schedule buffers</h3>
              <p className="tools-settings-hint">Extra minutes Dashboard uses around sleep and travel when estimating free time.</p>
              <div className="tools-settings-buffer-grid">
                <label className="tools-settings-field">
                  <span className="tools-settings-label">Sleep buffer (minutes)</span>
                  <input
                    className="tools-settings-input"
                    type="number"
                    defaultValue={settings.toolsSleepBufferMin ?? TOOLS_SETTINGS_DEFAULTS.toolsSleepBufferMin}
                    onBlur={(e) => updatePrefs.mutate({ toolsSleepBufferMin: Number(e.target.value) })}
                  />
                </label>
                <label className="tools-settings-field">
                  <span className="tools-settings-label">Travel buffer (minutes)</span>
                  <input
                    className="tools-settings-input"
                    type="number"
                    defaultValue={settings.toolsTravelBufferMin ?? TOOLS_SETTINGS_DEFAULTS.toolsTravelBufferMin}
                    onBlur={(e) => updatePrefs.mutate({ toolsTravelBufferMin: Number(e.target.value) })}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>
      ),
    },
    {
      id: 'focus',
      title: 'Focus',
      keywords: ['focus', 'pomodoro', 'ambient', 'sound', 'timer', 'preset'],
      render: () => (
        <section className="tools-settings-block" aria-labelledby="settings-focus-heading">
          <SettingsTitleBox
            id="settings-focus-heading"
            title="Focus"
          />
          <div className="tools-settings-section tools-settings-body-box">
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
          </div>
        </section>
      ),
    },
    {
      id: 'journal',
      title: 'Journal',
      keywords: ['journal', 'tags', 'prompt', 'streak', 'words', 'tasks', 'categories'],
      render: () => (
        <section className="tools-settings-block" aria-labelledby="settings-journal-heading">
          <SettingsTitleBox
            id="settings-journal-heading"
            title="Journal"
          />
          <div className="tools-settings-section tools-settings-body-box">
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
                <AppCheckbox
                  className="settings-app-check"
                  checked={Boolean(settings.journalDailyPromptEnabled)}
                  onChange={(e) => updatePrefs.mutate({ journalDailyPromptEnabled: e.target.checked })}
                >
                  Show daily writing prompt
                </AppCheckbox>
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
          </div>
        </section>
      ),
    },
  ], [
    widgetLayout, settings, habitDefs, newHabit, journalTags, newTag, customCategories, newCategory,
  ]);

  const normalizedQuery = toolQuery.trim().toLowerCase();
  const visibleToolSections = useMemo(() => {
    const sorted = [...toolSections].sort((a, b) => a.title.localeCompare(b.title));
    if (!normalizedQuery) return sorted;
    return sorted.filter((section) => {
      const haystack = [section.title, ...section.keywords].join(' ').toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [toolSections, normalizedQuery]);

  return (
    <div className="tools-settings-page">
      <header className="tools-settings-page-header">
        <div className="tools-settings-page-heading">
          <h1>Settings</h1>
          {email ? <p className="tools-settings-account-email">{email}</p> : null}
        </div>
        <button type="button" className="btn btn-sm tools-settings-sign-out" onClick={handleSignOut}>
          <LogOut size={15} aria-hidden />
          Sign out
        </button>
      </header>

      <section className="tools-settings-block" aria-labelledby="settings-all-heading">
        <SettingsTitleBox
          id="settings-all-heading"
          title="All"
        />
        <div className="tools-settings-section tools-settings-body-box">
          <div className="tools-settings-theme-row">
            <span className="tools-settings-theme-label">{themeDark ? 'Dark mode' : 'Light mode'}</span>
            <AppSwitch
              checked={themeDark}
              onChange={handleThemeToggle}
              disabled={updatePrefs.isPending}
              aria-label={themeDark ? 'Switch to light mode' : 'Switch to dark mode'}
            />
          </div>
        </div>
      </section>

      <div className="tools-settings-tools-block">
        <div className="tools-settings-tools-header">
          <p className="tools-settings-group-title">Tools</p>
          <label className="tools-settings-search">
            <Search size={15} aria-hidden />
            <input
              type="search"
              value={toolQuery}
              onChange={(e) => setToolQuery(e.target.value)}
              placeholder="Search tools"
              aria-label="Search tools"
            />
          </label>
        </div>

        {visibleToolSections.length === 0 ? (
          <p className="tools-settings-empty">No tools match “{toolQuery.trim()}”.</p>
        ) : (
          <div className="tools-settings-tool-list">
            {visibleToolSections.map((section) => (
              <div key={section.id} className="tools-settings-tool-block">
                {section.render()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
