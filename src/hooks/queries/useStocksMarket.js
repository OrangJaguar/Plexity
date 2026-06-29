import { useQuery } from '@tanstack/react-query';
import {
  fetchChart, fetchMarketNews, fetchMovers, fetchNews, fetchQuote,
  fetchQuoteSummary, fetchQuotes, runScreener, fetchSectorPerformance,
} from '@/lib/tools/stocks/stocks-provider';
import { INDEX_SYMBOLS } from '@/lib/tools/stocks/stocks-model';
import { getStocksRefreshIntervalMs } from '@/lib/tools/stocks/stocks-market-hours';

const marketRefetch = () => getStocksRefreshIntervalMs();

export function useIndexQuotes() {
  return useQuery({
    queryKey: ['stocks', 'indices'],
    queryFn: () => fetchQuotes(INDEX_SYMBOLS.map((i) => i.symbol)),
    staleTime: 60_000,
    refetchInterval: marketRefetch,
  });
}

export function useMovers() {
  return useQuery({
    queryKey: ['stocks', 'movers'],
    queryFn: async () => ({
      gainers: await fetchMovers('day_gainers', 25),
      losers: await fetchMovers('day_losers', 25),
      active: await fetchMovers('most_actives', 25),
    }),
    staleTime: 60_000,
    refetchInterval: marketRefetch,
  });
}

export function useMarketNews() {
  return useQuery({
    queryKey: ['stocks', 'market-news'],
    queryFn: () => fetchMarketNews(12),
    staleTime: 300_000,
  });
}

export function useStockQuote(symbol) {
  const sym = symbol?.toUpperCase();
  return useQuery({
    queryKey: ['stocks', 'quote', sym],
    queryFn: () => fetchQuote(sym),
    enabled: Boolean(sym),
    staleTime: 60_000,
    refetchInterval: marketRefetch,
  });
}

export function useStockSummary(symbol) {
  const sym = symbol?.toUpperCase();
  return useQuery({
    queryKey: ['stocks', 'summary', sym],
    queryFn: () => fetchQuoteSummary(sym),
    enabled: Boolean(sym),
    staleTime: 300_000,
  });
}

export function useStockChart(symbol, range, interval) {
  const sym = symbol?.toUpperCase();
  return useQuery({
    queryKey: ['stocks', 'chart', sym, range, interval],
    queryFn: () => fetchChart(sym, range, interval),
    enabled: Boolean(sym),
    staleTime: 120_000,
  });
}

export function useStockNews(symbol) {
  const sym = symbol?.toUpperCase();
  return useQuery({
    queryKey: ['stocks', 'news', sym],
    queryFn: () => fetchNews(sym, 15),
    enabled: Boolean(sym),
    staleTime: 300_000,
  });
}

export function useScreener(filters) {
  return useQuery({
    queryKey: ['stocks', 'screener', filters],
    queryFn: () => runScreener(filters, 200),
    staleTime: 180_000,
  });
}

export function useSectorPerformance() {
  return useQuery({
    queryKey: ['stocks', 'sector-performance'],
    queryFn: () => fetchSectorPerformance(),
    staleTime: 120_000,
    refetchInterval: marketRefetch,
  });
}

export function useWatchlistQuotes(symbols = []) {
  const clean = [...new Set(symbols.map((s) => s?.toUpperCase()).filter(Boolean))];
  return useQuery({
    queryKey: ['stocks', 'watchlist-quotes', clean.join(',')],
    queryFn: () => fetchQuotes(clean),
    enabled: clean.length > 0,
    staleTime: 60_000,
    refetchInterval: marketRefetch,
  });
}
