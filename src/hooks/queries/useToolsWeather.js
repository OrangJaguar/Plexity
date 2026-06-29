import { useQuery } from '@tanstack/react-query';
import { fetchWeatherForLocation, resolveWeatherLocation } from '@/lib/tools/weather-api';
import { fetchStockQuotes } from '@/lib/tools/stock-api';
import { useStockQuoteCadence } from '@/hooks/useStockQuoteCadence';

export function useToolsWeather(location, unit = 'fahrenheit') {
  const hasCoords = location && typeof location === 'object' && location.latitude != null;
  const legacyCity = typeof location === 'string' ? location : null;

  return useQuery({
    queryKey: ['tools-weather', hasCoords ? location.latitude : legacyCity, hasCoords ? location.longitude : null, unit],
    queryFn: async () => {
      const resolved = hasCoords ? location : await resolveWeatherLocation(legacyCity);
      if (!resolved) return null;
      return fetchWeatherForLocation(resolved, unit);
    },
    enabled: Boolean(hasCoords || legacyCity?.trim()),
    staleTime: 15 * 60_000,
    retry: 1,
  });
}

export function useToolsStocks(symbols = []) {
  const clean = symbols.filter(Boolean);
  const { intervalMs, staleTimeMs } = useStockQuoteCadence();

  return useQuery({
    queryKey: ['tools-stocks', clean.join(',')],
    queryFn: () => fetchStockQuotes(clean),
    enabled: clean.length > 0,
    staleTime: staleTimeMs,
    refetchInterval: intervalMs,
    retry: 1,
  });
}
