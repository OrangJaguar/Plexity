import { base44 } from '@/api/base44Client';

function extractResults(res) {
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.data?.results)) return res.data.results;
  return [];
}

/** Search stock symbols via server proxy (Yahoo blocks browser CORS). */
export async function searchStockSymbolsRemote(query) {
  const res = await base44.functions.invoke('toolsMarketData', {
    action: 'search',
    query: query?.trim() || '',
  });
  if (res?.error) throw new Error(res.error.message || 'Search failed');
  return extractResults(res);
}

/** Fetch quotes for up to 3 symbols via server proxy. */
export async function fetchStockQuotesRemote(symbols = []) {
  const res = await base44.functions.invoke('toolsMarketData', {
    action: 'quotes',
    symbols,
  });
  if (res?.error) throw new Error(res.error.message || 'Quotes failed');
  return extractResults(res);
}
