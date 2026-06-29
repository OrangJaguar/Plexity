import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getEntry, listEntries, upsertEntry } from '@/api/entities/toolsJournal';
import { queryKeys } from '@/api/query-keys';
import { getTodayKey } from '@/lib/tools/date';

function normalizeUpsertArgs(dateKey, patch) {
  if (typeof patch === 'string') return { dateKey, content: patch };
  return { dateKey, ...patch };
}

export function useToolsJournal() {
  const queryClient = useQueryClient();
  const todayKey = getTodayKey();

  const todayQuery = useQuery({
    queryKey: queryKeys.tools.journal(todayKey),
    queryFn: () => getEntry(todayKey),
    enabled: true,
    retry: false,
    staleTime: 10_000,
  });

  const allQuery = useQuery({
    queryKey: queryKeys.tools.journalAll,
    queryFn: listEntries,
    enabled: true,
    placeholderData: [],
    retry: false,
    staleTime: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.journal(todayKey) });
    queryClient.invalidateQueries({ queryKey: queryKeys.tools.journalAll });
  };

  const upsertMutation = useMutation({
    mutationFn: (args) => upsertEntry(args.dateKey, args),
    onSuccess: invalidate,
  });

  return {
    todayKey,
    todayEntry: todayQuery.data,
    isTodayLoading: todayQuery.isLoading && !todayQuery.isFetched,
    entries: allQuery.data ?? [],
    isEntriesLoading: allQuery.isLoading && !allQuery.isFetched,
    upsertEntry: (dateKey, patch) => upsertMutation.mutateAsync(normalizeUpsertArgs(dateKey, patch)),
    isSaving: upsertMutation.isPending,
  };
}
