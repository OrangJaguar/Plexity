import { base44 } from '@/api/base44Client';
import { unwrapFunctionInvoke } from '@/api/tools/invoke-response';

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
  return extractResults(unwrapFunctionInvoke(res));
}

/** Fetch quotes for up to 3 symbols via server proxy. */
export async function fetchStockQuotesRemote(symbols = []) {
  const res = await base44.functions.invoke('toolsMarketData', {
    action: 'quotes',
    symbols,
  });
  return extractResults(unwrapFunctionInvoke(res));
}
