import { base44 } from '@/api/base44Client';
import { unwrapFunctionInvoke } from '@/api/tools/invoke-response';
import { fetchQuotes, searchSymbols } from '@/lib/tools/stocks/stocks-provider';

function extractResults(res) {
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.data?.results)) return res.data.results;
  return [];
}

async function invokeMarketData(payload) {
  const res = await base44.functions.invoke('toolsMarketData', payload);
  return unwrapFunctionInvoke(res);
}

/** Search stock symbols via server proxy (Yahoo blocks browser CORS). */
export async function searchStockSymbolsRemote(query) {
  const body = await invokeMarketData({
    action: 'search',
    query: query?.trim() || '',
  });
  return extractResults(body);
}

/** Fetch quotes for dashboard widget symbols via server proxy. */
export async function fetchStockQuotesRemote(symbols = []) {
  const body = await invokeMarketData({
    action: 'quotes',
    symbols,
  });
  const rows = extractResults(body);
  if (rows.some((row) => row?.price != null)) return rows;

  // Same path as the stocks tool — avoids a dead /yahoo-finance fallback in production.
  const unique = [...new Set(symbols.map((s) => String(s).trim().toUpperCase()).filter(Boolean))].slice(0, 3);
  if (!unique.length) return rows;

  const quotes = await fetchQuotes(unique);
  return quotes.map((q) => ({
    symbol: q.symbol,
    price: q.price ?? null,
    change: q.change ?? null,
  }));
}

/** Prefer the unified stocks-tool search (yahoo action) for new code. */
export async function searchStockSymbolsUnified(query) {
  const rows = await searchSymbols(query?.trim() || '');
  return rows.map(({ symbol, name }) => ({ symbol, name }));
}
