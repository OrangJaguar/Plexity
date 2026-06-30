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
import { spawnNextRecurrenceTask } from '@/lib/tools/task-recurrence';

function applyTaskOrder(rows, orderUpdates) {
  const orderMap = Object.fromEntries(
    orderUpdates.map(({ taskId, manualSortOrder, sortOrder }) => [
      taskId,
      manualSortOrder ?? sortOrder,
    ]),
  );
  return [...rows]
    .map((t) => (
      orderMap[t.taskId] != null
        ? { ...t, manualSortOrder: orderMap[t.taskId], sortOrder: orderMap[t.taskId] }
        : t
    ))
    .sort((a, b) => (a.manualSortOrder ?? 0) - (b.manualSortOrder ?? 0));
}

export function useToolsTasks() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.tools.tasks,
    queryFn: listTasks,
    enabled: true,
    placeholderData: [],
    retry: false,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.tools.tasks });

  const createMutation = useMutation({
    mutationFn: createTask,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.tasks });
      const prev = queryClient.getQueryData(queryKeys.tools.tasks);
      const now = Date.now();
      const taskId = payload.taskId || crypto.randomUUID();
      const optimistic = {
        taskId,
        id: taskId,
        title: payload.title || 'Untitled',
        due: payload.due || '',
        priority: payload.priority || 'medium',
        className: payload.className || '',
        notes: payload.notes || '',
        type: payload.type || 'task',
        estimatedMinutes: payload.estimatedMinutes ?? null,
        subtasks: payload.subtasks || [],
        recurrenceRule: payload.recurrenceRule || null,
        completed: false,
        manualSortOrder: payload.manualSortOrder ?? now,
        sortOrder: payload.manualSortOrder ?? now,
        createdAt: now,
        updatedAt: now,
      };
      queryClient.setQueryData(queryKeys.tools.tasks, (old) => [...(old || []), optimistic]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tools.tasks, ctx.prev);
    },
    onSettled: invalidate,
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
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.tasks });
      const prev = queryClient.getQueryData(queryKeys.tools.tasks);
      queryClient.setQueryData(queryKeys.tools.tasks, (old) =>
        (old || []).filter((t) => t.taskId !== taskId),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tools.tasks, ctx.prev);
    },
    onSettled: invalidate,
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: deleteRecurringFuture,
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: reorderTasks,
    onMutate: async (orderUpdates) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tools.tasks });
      const prev = queryClient.getQueryData(queryKeys.tools.tasks);
      queryClient.setQueryData(queryKeys.tools.tasks, (old) => applyTaskOrder(old || [], orderUpdates));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKeys.tools.tasks, ctx.prev);
    },
    onSettled: invalidate,
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
