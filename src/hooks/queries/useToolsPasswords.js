import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPasswordsEnvelope,
  savePasswordsEnvelope,
} from '@/api/entities/toolsPasswords';
import { queryKeys } from '@/api/query-keys';
import { useAuth } from '@/hooks/useAuth';

export function useToolsPasswords() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.tools.passwords,
    queryFn: getPasswordsEnvelope,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: savePasswordsEnvelope,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.tools.passwords, data);
    },
  });

  return {
    envelope: query.data?.envelope ?? null,
    userEmail: query.data?.userEmail ?? null,
    isLoading: query.isLoading,
    saveEnvelope: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
