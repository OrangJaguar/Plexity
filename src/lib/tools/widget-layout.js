export const MAX_DASHBOARD_WIDGETS = 2;
export const HABIT_LABEL_MAX = 28;
export const INLINE_QUOTE_MAX = 42;

export const WIDGET_CATALOG = {
  quote: {
    label: 'Daily quote',
    description: 'A short built-in line that rotates by day of month.',
    icon: '❝',
  },
  habits: {
    label: 'Habit tracker',
    description: 'Compact habit checkboxes on your dashboard summary.',
    icon: '✓',
  },
  weather: {
    label: 'Weather',
    description: 'Current temperature for a city (Open-Meteo).',
    icon: '☁',
  },
  stocks: {
    label: 'Stock ticker',
    description: 'Up to 3 symbols with daily change % (Yahoo Finance).',
    icon: '↗',
  },
};

export const DEFAULT_WIDGET_LAYOUT = [
  { id: 'quote', enabled: false },
  { id: 'habits', enabled: false },
  { id: 'weather', enabled: false },
  { id: 'stocks', enabled: false },
];

export function countEnabledWidgets(layout) {
  return (layout || []).filter((item) => item.enabled).length;
}

export function normalizeWidgetLayout(layout) {
  let enabled = 0;
  return (layout || DEFAULT_WIDGET_LAYOUT).map((item) => {
    if (!item.enabled) return { id: item.id, enabled: false };
    enabled += 1;
    if (enabled > MAX_DASHBOARD_WIDGETS) return { id: item.id, enabled: false };
    return { id: item.id, enabled: true };
  });
}

export function mergeWidgetLayout(preferences) {
  const widgets = preferences?.toolsDashboardWidgets || {};
  const saved = preferences?.toolsDashboardWidgetLayout;
  let layout;
  if (Array.isArray(saved) && saved.length) {
    layout = saved.map((item) => ({
      id: item.id,
      enabled: widgets[item.id] ?? item.enabled ?? false,
    }));
  } else {
    layout = DEFAULT_WIDGET_LAYOUT.map((item) => ({
      ...item,
      enabled: Boolean(widgets[item.id]),
    }));
  }
  return normalizeWidgetLayout(layout);
}

export function getEnabledWidgets(layout) {
  return normalizeWidgetLayout(layout).filter((item) => item.enabled);
}

export function syncWidgetsFromLayout(layout) {
  return normalizeWidgetLayout(layout).reduce((acc, item) => {
    acc[item.id] = Boolean(item.enabled);
    return acc;
  }, {});
}

export function canEnableWidget(layout, id) {
  const item = layout.find((w) => w.id === id);
  if (!item || item.enabled) return true;
  return countEnabledWidgets(layout) < MAX_DASHBOARD_WIDGETS;
}
