import { useEffect, useMemo, useState } from 'react';
import { stockQuoteCadenceMs } from '@/lib/tools/market-hours';

/** Recompute stock poll cadence when US market session boundaries may have changed. */
export function useStockQuoteCadence() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return useMemo(() => {
    const ms = stockQuoteCadenceMs();
    return { intervalMs: ms, staleTimeMs: ms };
  }, [tick]);
}
