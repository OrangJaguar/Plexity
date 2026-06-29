import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useToolsSettings } from '@/hooks/queries/useToolsSettings';
import { useToolsWeather, useToolsStocks } from '@/hooks/queries/useToolsWeather';
import { usePreferences } from '@/hooks/queries/usePreferences';
import { useUpdatePreferences } from '@/hooks/mutations/usePreferencesMutations';
import { computeFreeTimeMinutes, formatFreeTimeHours } from '@/lib/tools/free-time';
import { getDebriefItemsForToday, formatDebriefItemTime, formatDebriefClipboard } from '@/lib/tools/debrief';
import { mergeWidgetLayout, getEnabledWidgets } from '@/lib/tools/widget-layout';
import DashboardWidgetStrip from '@/components/tools/dashboard/DashboardWidgetStrip';

function getPriorityTasks(tasks) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [...(tasks || [])]
    .filter((t) => !t.completed)
    .filter((t) => {
      if (!t.due) return false;
      const due = new Date(t.due).getTime();
      return due <= now + day;
    })
    .sort((a, b) => {
      const po = { high: 0, medium: 1, low: 2, empty: 3 };
      return (po[a.priority] ?? 3) - (po[b.priority] ?? 3);
    })
    .slice(0, 3);
}

export default function DailyIntelligencePanel({
  schedule,
  tasks,
  events,
  expanded = true,
  onExpandedChange,
  onCompleteTask,
}) {
  const [copyLabel, setCopyLabel] = useState('Copy summary');
  const { settings } = useToolsSettings();
  const { data: preferences } = usePreferences();
  const updatePrefs = useUpdatePreferences();
  const weatherLocation = settings.toolsWeatherLocation || settings.toolsWeatherCity;
  const weatherUnit = settings.toolsWeatherUnit || 'fahrenheit';
  const { data: weather } = useToolsWeather(weatherLocation, weatherUnit);
  const { data: stocks = [], isLoading: stocksLoading, isError: stocksError } = useToolsStocks(settings.toolsStockSymbols || []);
  const now = useMemo(() => new Date(), []);

  const widgetLayout = useMemo(() => mergeWidgetLayout(preferences), [preferences]);
  const enabledWidgets = useMemo(() => getEnabledWidgets(widgetLayout), [widgetLayout]);

  const debriefItems = getDebriefItemsForToday(events, tasks);
  const remainingEvents = debriefItems.filter((i) => i.kind === 'event').length;
  const dueTasks = (tasks || []).filter((t) => !t.completed && t.due).length;
  const freeMin = computeFreeTimeMinutes(now, schedule, events, tasks, settings);
  const priorityTasks = getPriorityTasks(tasks);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(formatDebriefClipboard(debriefItems, {
        blockedMin: 0,
        roughFree: freeMin,
      }));
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy summary'), 1400);
    } catch { /* ignore */ }
  };

  const handleHabitToggle = (habitId) => {
    const checks = { ...(settings.toolsHabitChecks || {}) };
    checks[habitId] = !checks[habitId];
    updatePrefs.mutate({ toolsHabitChecks: checks });
  };

  const summaryParts = [
    dueTasks ? `${dueTasks} task${dueTasks === 1 ? '' : 's'} due` : null,
    remainingEvents ? `${remainingEvents} event${remainingEvents === 1 ? '' : 's'} remaining` : null,
    formatFreeTimeHours(freeMin),
  ].filter(Boolean);

  return (
    <section className={`tools-intel-panel${expanded ? ' expanded' : ' collapsed'}`}>
      <div className="tools-intel-panel-header">
        <div className="tools-intel-summary-row">
          <span className="tools-intel-summary">
            {summaryParts.length ? summaryParts.join(' · ') : 'Daily intelligence'}
          </span>
          <DashboardWidgetStrip
            enabledWidgets={enabledWidgets}
            settings={settings}
            weather={weather}
            stocks={stocks}
            stocksLoading={stocksLoading}
            stocksError={stocksError}
            onHabitToggle={handleHabitToggle}
          />
        </div>
        <button
          type="button"
          className="tools-intel-toggle-btn"
          onClick={() => onExpandedChange?.(!expanded)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse intelligence panel' : 'Expand intelligence panel'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="tools-intel-body">
          <div className="tools-intel-scroll">
            <div className="tools-intel-section tools-intel-section--timeline">
              <h4>Today&apos;s Timeline</h4>
              <div className="tools-intel-timeline">
                {!debriefItems.length ? (
                  <p className="tools-empty-hint">Nothing scheduled for today.</p>
                ) : (
                  debriefItems.map((it, i) => (
                    <div key={i} className={`tools-intel-timeline-row${it.completed ? ' completed' : ''}`}>
                      <span>{it.title}</span>
                      <span className="meta">{formatDebriefItemTime(it)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {priorityTasks.length > 0 && (
              <div className="tools-intel-section">
                <h4>Priority Tasks</h4>
                {priorityTasks.map((t) => (
                  <label key={t.taskId} className="tools-intel-priority-row">
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() => onCompleteTask?.(t.taskId)}
                    />
                    <span>{t.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="tools-intel-bottom">
            <div className="tools-intel-section tools-intel-section--footer">
              <h4>Free Time Estimate</h4>
              <p className="tools-intel-freetime">{formatFreeTimeHours(freeMin)} available (after schedule, tasks, sleep & travel buffers)</p>
            </div>
            <div className="tools-intel-footer">
              <button type="button" className="btn btn-sm" onClick={handleCopy}>{copyLabel}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
