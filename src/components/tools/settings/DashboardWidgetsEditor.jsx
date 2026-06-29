import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  WIDGET_CATALOG,
  MAX_DASHBOARD_WIDGETS,
  countEnabledWidgets,
  canEnableWidget,
  HABIT_LABEL_MAX,
} from '@/lib/tools/widget-layout';
import WeatherCityAutocomplete from '@/components/tools/settings/WeatherCityAutocomplete';
import StockSymbolFields from '@/components/tools/settings/StockSymbolFields';
import { normalizeStockSlots, stockSlotsToArray } from '@/lib/tools/stock-api';

export default function DashboardWidgetsEditor({
  layout,
  settings,
  onLayoutChange,
  onWeatherLocation,
  onWeatherUnit,
  onStockSymbols,
  habitDefs,
  onAddHabit,
  onRemoveHabit,
  newHabit,
  setNewHabit,
}) {
  const enabledCount = countEnabledWidgets(layout);
  const atMax = enabledCount >= MAX_DASHBOARD_WIDGETS;
  const stockSlots = normalizeStockSlots(settings.toolsStockSymbols);

  const move = (idx, dir) => {
    const next = [...layout];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onLayoutChange(next);
  };

  const patchItem = (id, patch) => {
    if (patch.enabled && !canEnableWidget(layout, id)) return;
    const next = layout.map((item) => (item.id === id ? { ...item, ...patch } : item));
    onLayoutChange(next);
  };

  const handleAddHabit = () => {
    const label = newHabit.trim().slice(0, HABIT_LABEL_MAX);
    if (!label) return;
    onAddHabit(label);
  };

  return (
    <div className="tools-widget-editor">
      {layout.map((item, idx) => {
        const meta = WIDGET_CATALOG[item.id] || {};
        const toggleDisabled = !item.enabled && atMax;

        return (
          <div key={item.id} className={`tools-widget-card${item.enabled ? ' enabled' : ''}`}>
            <div className="tools-widget-card-top">
              <div className="tools-widget-card-title">
                <span className="tools-widget-card-icon" aria-hidden>{meta.icon}</span>
                <div>
                  <strong>{meta.label}</strong>
                  <p>{meta.description}</p>
                </div>
              </div>
              <div className="tools-widget-card-actions">
                <button type="button" className="tools-widget-order-btn" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Move up">
                  <ChevronUp size={14} />
                </button>
                <button type="button" className="tools-widget-order-btn" onClick={() => move(idx, 1)} disabled={idx === layout.length - 1} aria-label="Move down">
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>

            <div className="tools-widget-card-controls">
              <label className={`tools-widget-toggle${toggleDisabled ? ' disabled' : ''}`} title={toggleDisabled ? `Maximum ${MAX_DASHBOARD_WIDGETS} widgets` : undefined}>
                <input
                  type="checkbox"
                  checked={item.enabled}
                  disabled={toggleDisabled}
                  onChange={(e) => patchItem(item.id, { enabled: e.target.checked })}
                />
                <span>Show on dashboard</span>
              </label>
            </div>

            {item.id === 'quote' && item.enabled && (
              <p className="tools-settings-hint">Rotates daily from a built-in short quote list (changes by day of month).</p>
            )}

            {item.enabled && item.id === 'weather' && (
              <WeatherCityAutocomplete
                location={settings.toolsWeatherLocation || (settings.toolsWeatherCity ? { label: settings.toolsWeatherCity, name: settings.toolsWeatherCity } : null)}
                unit={settings.toolsWeatherUnit || 'fahrenheit'}
                onSelect={(loc) => onWeatherLocation(loc)}
                onUnitChange={onWeatherUnit}
              />
            )}

            {item.enabled && item.id === 'stocks' && (
              <div className="tools-widget-inline-field">
                <StockSymbolFields
                  slots={stockSlots}
                  onChange={(slots) => onStockSymbols(stockSlotsToArray(slots))}
                />
                <span className="tools-settings-hint">Pick up to 3 symbols. Dashboard shows ticker and daily % change.</span>
              </div>
            )}

            {item.enabled && item.id === 'habits' && (
              <div className="tools-widget-inline-field">
                <div className="tools-widget-habit-list">
                  {habitDefs.map((h) => (
                    <div key={h.id} className="tools-settings-tag-row">
                      <span>{h.label}</span>
                      <button type="button" className="btn btn-sm" onClick={() => onRemoveHabit(h.id)}>Remove</button>
                    </div>
                  ))}
                </div>
                <div className="tools-settings-inline-add">
                  <input
                    className="tools-settings-input"
                    type="text"
                    placeholder="New habit"
                    maxLength={HABIT_LABEL_MAX}
                    value={newHabit}
                    onChange={(e) => setNewHabit(e.target.value.slice(0, HABIT_LABEL_MAX))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHabit(); } }}
                  />
                  <button type="button" className="btn btn-sm" onClick={handleAddHabit}>Add</button>
                </div>
                <span className="tools-settings-hint">Max {HABIT_LABEL_MAX} characters per habit.</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
