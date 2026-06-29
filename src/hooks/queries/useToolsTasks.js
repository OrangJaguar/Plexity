import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  deleteRecurringFuture,
  reorderTasks,
} from '@/api/entities/toolsTasks';
import { queryKeys } from '@/api/query-keys';
import { useAuth } from '@/hooks/useAuth';
import { spawnNextRecurrenceTask } from '@/lib/tools/task-recurrence';

export function useToolsTasks() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const query = useQuery({
    queryKey: queryKeys.tools.tasks,
    queryFn: listTasks,
    enabled: isAuthenticated,
    placeholderData: [],
    retry: false,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.tasks });

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, patch }) => updateTask(taskId, patch),
    onMutate: async ({ taskId, patch }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.tasks });
      const prev = queryClient.getQueryData(queryKeys.tools.tasks);
      queryClient.setQueryData(queryKeys.tools.tasks, (old) =>
        (old || []).map((t) => (t.taskId === taskId ? { ...t, ...patch } : t)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tools.tasks, ctx.prev);
    },
    onSettled: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: invalidate,
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: deleteRecurringFuture,
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: reorderTasks,
    onSuccess: invalidate,
  });

  const completeTask = async (task, complete, { subtasks } = {}) => {
    if (complete) {
      await updateMutation.mutateAsync({
        taskId: task.taskId,
        patch: {
          completed: true,
          completedAt: Date.now(),
          subtasks: subtasks ?? task.subtasks,
        },
      });
      const next = spawnNextRecurrenceTask({
        ...task,
        subtasks: subtasks ?? task.subtasks,
        completed: true,
      });
      if (next) {
        await createMutation.mutateAsync(next);
      }
    } else {
      await updateMutation.mutateAsync({
        taskId: task.taskId,
        patch: { completed: false, completedAt: null },
      });
    }
  };

  return {
    ...query,
    tasks: query.data ?? [],
    createTask: createMutation.mutateAsync,
    updateTask: (taskId, patch) => updateMutation.mutateAsync({ taskId, patch }),
    deleteTask: deleteMutation.mutateAsync,
    deleteRecurringFuture: deleteRecurringMutation.mutateAsync,
    reorderTasks: reorderMutation.mutateAsync,
    completeTask,
  };
}
