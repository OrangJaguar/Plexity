import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/api/query-keys';
import { getOrCreateStocksWorkspace, saveStocksWorkspace } from '@/api/entities/toolsStocksWorkspace';

export function useToolsStocksWorkspace() {
  return useQuery({
    queryKey: queryKeys.tools.stocksWorkspace,
    queryFn: getOrCreateStocksWorkspace,
    staleTime: 30_000,
  });
}

export function useSaveStocksWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveStocksWorkspace,
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.tools.stocksWorkspace, data);
    },
  });
}
