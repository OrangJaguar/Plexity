import { getDailyQuote } from '@/lib/tools/tools-settings';
import { INLINE_QUOTE_MAX } from '@/lib/tools/widget-layout';

function truncateQuote(text, max = INLINE_QUOTE_MAX) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

export default function DashboardWidgetStrip({
  enabledWidgets,
  settings,
  weather,
  stocks,
  stocksLoading,
  stocksError,
  onHabitToggle,
}) {
  const parts = [];

  for (const item of enabledWidgets) {
    if (item.id === 'weather') {
      const loc = settings.toolsWeatherLocation;
      const legacy = settings.toolsWeatherCity;
      if (!loc && !legacy) continue;
      parts.push(
        <span key="weather" className="tools-intel-widget-chip" title={weather?.city || legacy}>
          ☁ {weather ? `${weather.temp}°${weather.unit}` : '…'}
        </span>,
      );
    }

    if (item.id === 'stocks') {
      const syms = (settings.toolsStockSymbols || []).filter(Boolean);
      if (!syms.length) continue;
      if (stocksLoading) {
        parts.push(<span key="stocks-loading" className="tools-intel-widget-chip">↗ …</span>);
        continue;
      }
      if (stocksError) {
        parts.push(
          <span key="stocks-error" className="tools-intel-widget-chip" title="Deploy toolsMarketData in Base44 for live quotes">
            ↗ unavailable
          </span>,
        );
        continue;
      }
      for (const s of stocks || []) {
        parts.push(
          <span
            key={s.symbol}
            className={`tools-intel-widget-chip tools-intel-widget-chip--stock${s.change != null && s.change < 0 ? ' down' : ' up'}`}
            title={s.price != null ? `$${s.price.toFixed(2)}` : 'Quote unavailable'}
          >
            {s.symbol}
            {' '}
            {s.change != null ? `${s.change >= 0 ? '+' : ''}${s.change.toFixed(1)}%` : '—'}
          </span>,
        );
      }
      if (!stocks?.length) {
        parts.push(<span key="stocks-empty" className="tools-intel-widget-chip">↗ —</span>);
      }
    }

    if (item.id === 'quote') {
      const full = getDailyQuote();
      parts.push(
        <span key="quote" className="tools-intel-widget-chip tools-intel-widget-chip--quote" title={full}>
          ❝ {truncateQuote(full)}
        </span>,
      );
    }

    if (item.id === 'habits') {
      for (const h of settings.toolsHabitDefinitions || []) {
        parts.push(
          <label key={h.id} className="tools-intel-widget-chip tools-intel-widget-chip--habit">
            <input
              type="checkbox"
              checked={Boolean(settings.toolsHabitChecks?.[h.id])}
              onChange={() => onHabitToggle?.(h.id)}
            />
            <span>{h.label}</span>
          </label>,
        );
      }
    }
  }

  if (!parts.length) return null;

  return (
    <span className="tools-intel-widget-strip">
      {parts.map((part, i) => (
        <span key={part.key} className="tools-intel-widget-strip-item">
          {i > 0 ? <span className="tools-intel-widget-sep" aria-hidden>·</span> : null}
          {part}
        </span>
      ))}
    </span>
  );
}
