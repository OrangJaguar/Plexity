import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatUpdatedAgo, getStocksRefreshIntervalMs } from '@/lib/tools/stocks/stocks-market-hours';

/** Live "Updated Xs ago" label driven by stocks query cache freshness. */
export function useStocksRefreshStatus() {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  let latest = 0;
  queryClient.getQueryCache().findAll({ queryKey: ['stocks'] }).forEach((q) => {
    const t = q.state.dataUpdatedAt;
    if (t && t > latest) latest = t;
  });

  const agoMs = latest ? Date.now() - latest : null;
  return {
    label: formatUpdatedAgo(agoMs),
    lastUpdatedAt: latest || null,
    refreshIntervalMs: getStocksRefreshIntervalMs(),
  };
}