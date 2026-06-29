const ET = 'America/New_York';

function getEtParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ET,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const map = Object.fromEntries(
    parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]),
  );

  return {
    weekday: map.weekday,
    minutes: Number(map.hour) * 60 + Number(map.minute),
  };
}

/** US equity regular session: Mon–Fri 9:30 AM – 4:00 PM Eastern. */
export function isUsMarketHours(date = new Date()) {
  const { weekday, minutes } = getEtParts(date);
  if (weekday === 'Sat' || weekday === 'Sun') return false;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  return minutes >= open && minutes < close;
}

export const STOCK_REFETCH_MARKET_MS = 2 * 60_000;
export const STOCK_REFETCH_OFF_HOURS_MS = 15 * 60_000;

export function stockQuoteCadenceMs(date = new Date()) {
  return isUsMarketHours(date) ? STOCK_REFETCH_MARKET_MS : STOCK_REFETCH_OFF_HOURS_MS;
}
