const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

export function formatWeatherLocationLabel(loc) {
  if (!loc) return '';
  if (loc.label) return loc.label;
  const parts = [loc.name, loc.admin1, loc.country].filter(Boolean);
  return parts.join(', ');
}

/** @param {string} query @returns {Promise<Array>} */
export async function searchWeatherCities(query) {
  const q = query?.trim();
  if (!q || q.length < 2) return [];
  const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`);
  if (!res.ok) throw new Error('City search failed');
  const data = await res.json();
  return (data?.results || []).map((hit) => ({
    name: hit.name,
    admin1: hit.admin1 || '',
    country: hit.country || hit.country_code || '',
    latitude: hit.latitude,
    longitude: hit.longitude,
    label: [hit.name, hit.admin1, hit.country].filter(Boolean).join(', '),
  }));
}

/** Resolve legacy string city to a location object. */
export async function resolveWeatherLocation(cityOrLocation) {
  if (!cityOrLocation) return null;
  if (typeof cityOrLocation === 'object' && cityOrLocation.latitude != null) {
    return cityOrLocation;
  }
  const q = String(cityOrLocation).trim();
  if (!q) return null;
  const hits = await searchWeatherCities(q);
  return hits.find((h) => h.label.toLowerCase() === q.toLowerCase() || h.name.toLowerCase() === q.toLowerCase())
    || hits[0]
    || null;
}

/** @param {{ latitude: number, longitude: number, name?: string }} location @param {'fahrenheit'|'celsius'} unit */
export async function fetchWeatherForLocation(location, unit = 'fahrenheit') {
  if (location?.latitude == null || location?.longitude == null) return null;
  const tempUnit = unit === 'celsius' ? 'celsius' : 'fahrenheit';
  const url = `${FORECAST_URL}?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code&temperature_unit=${tempUnit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather failed');
  const data = await res.json();
  const temp = Math.round(data?.current?.temperature_2m ?? 0);
  return {
    city: location.name || formatWeatherLocationLabel(location),
    temp,
    unit: tempUnit === 'celsius' ? 'C' : 'F',
    code: data?.current?.weather_code,
  };
}
