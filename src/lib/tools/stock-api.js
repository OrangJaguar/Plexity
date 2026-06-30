import { fetchQuotes, searchSymbols } from '@/lib/tools/stocks/stocks-provider';
import { POPULAR_TICKERS } from '@/lib/tools/popular-tickers';

function localSymbolSearch(query) {
  const q = query?.trim().toUpperCase();
  if (!q) return [];
  return POPULAR_TICKERS
    .filter((row) => row.symbol.startsWith(q) || row.name.toUpperCase().includes(q))
    .slice(0, 8);
}

/** @param {string} query @returns {Promise<Array<{ symbol: string, name: string }>>} */
export async function searchStockSymbols(query) {
  const q = query?.trim();
  if (!q || q.length < 1) return [];

  try {
    const remote = await searchSymbols(q);
    if (remote.length) {
      return remote.map(({ symbol, name }) => ({ symbol, name }));
    }
  } catch {
    /* fall through to local list */
  }

  const local = localSymbolSearch(q);
  if (local.length) return local;

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
    const quotes = await fetchQuotes(unique);
    return quotes.map((q) => ({
      symbol: q.symbol,
      price: q.price ?? null,
      change: q.change ?? null,
    }));
  } catch {
    return unique.map((sym) => ({ symbol: sym, price: null, change: null }));
  }
}

/** Normalize prefs array to exactly 3 slots. */
export function normalizeStockSlots(symbols) {
  const arr = Array.isArray(symbols) ? symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean) : [];
  return [arr[0] || '', arr[1] || '', arr[2] || ''];
}

export function stockSlotsToArray(slots) {
  return slots.filter(Boolean);
}
