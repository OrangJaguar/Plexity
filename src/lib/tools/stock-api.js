import { searchStockSymbolsRemote, fetchStockQuotesRemote } from '@/api/tools/marketData';
import { POPULAR_TICKERS } from '@/lib/tools/popular-tickers';

const UA = 'Mozilla/5.0 (compatible; Plexity/1.0)';

function localSymbolSearch(query) {
  const q = query?.trim().toUpperCase();
  if (!q) return [];
  return POPULAR_TICKERS
    .filter((row) => row.symbol.startsWith(q) || row.name.toUpperCase().includes(q))
    .slice(0, 8);
}

function parseYahooChartPayload(data, sym) {
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta?.regularMarketPrice) return { symbol: sym, price: null, change: null };
  const price = meta.regularMarketPrice;
  const prev = meta.chartPreviousClose ?? meta.previousClose;
  const change = prev ? ((price - prev) / prev) * 100 : 0;
  return { symbol: sym, price, change };
}

/** Dev / fallback proxy path (see vite.config.js). */
async function fetchYahooQuoteViaProxy(symbol) {
  const sym = symbol.trim().toUpperCase();
  const url = `/yahoo-finance/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Quote proxy failed (${res.status})`);
  const data = await res.json();
  return parseYahooChartPayload(data, sym);
}

/** @param {string} query @returns {Promise<Array<{ symbol: string, name: string }>>} */
export async function searchStockSymbols(query) {
  const q = query?.trim();
  if (!q || q.length < 1) return [];

  try {
    const remote = await searchStockSymbolsRemote(q);
    if (remote.length) return remote;
  } catch {
    /* fall through to local list */
  }

  const local = localSymbolSearch(q);
  if (local.length) return local;

  /* Exact symbol typed — allow manual entry even if search API unavailable */
  if (/^[A-Z][A-Z0-9.\-]{0,9}$/i.test(q)) {
    return [{ symbol: q.toUpperCase(), name: q.toUpperCase() }];
  }

  return [];
}

export async function fetchStockQuote(symbol) {
  const rows = await fetchStockQuotes([symbol]);
  return rows[0] || { symbol: symbol?.toUpperCase(), price: null, change: null };
}

export async function fetchStockQuotes(symbols = []) {
  const unique = [...new Set(symbols.map((s) => s?.trim().toUpperCase()).filter(Boolean))].slice(0, 3);
  if (!unique.length) return [];

  try {
    const remote = await fetchStockQuotesRemote(unique);
    const hasPrices = remote.some((row) => row?.price != null);
    if (hasPrices) return remote;
  } catch {
    /* try proxy fallback */
  }

  try {
    const proxied = await Promise.all(
      unique.map(async (sym) => {
        try {
          return await fetchYahooQuoteViaProxy(sym);
        } catch {
          return { symbol: sym, price: null, change: null };
        }
      }),
    );
    if (proxied.some((row) => row.price != null)) return proxied;
  } catch {
    /* no quotes available */
  }

  return unique.map((sym) => ({ symbol: sym, price: null, change: null }));
}

/** Normalize prefs array to exactly 3 slots. */
export function normalizeStockSlots(symbols) {
  const arr = Array.isArray(symbols) ? symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean) : [];
  return [arr[0] || '', arr[1] || '', arr[2] || ''];
}

export function stockSlotsToArray(slots) {
  return slots.filter(Boolean);
}
