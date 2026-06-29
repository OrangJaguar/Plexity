import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import TasksContent from '@/components/tools/tasks/TasksContent';
import { useToolsTasks } from '@/hooks/queries/useToolsTasks';
import { useToolsSchedule } from '@/hooks/queries/useToolsSchedule';
import { useToolsSettings } from '@/hooks/queries/useToolsSettings';
import { getAllCategories } from '@/lib/tools/tools-settings';
import { useMemo } from 'react';

export default function ToolsTasksPage() {
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    deleteRecurringFuture,
    reorderTasks,
    completeTask,
  } = useToolsTasks();
  const { data: schedule } = useToolsSchedule();
  const { settings } = useToolsSettings();

  const categories = useMemo(
    () => getAllCategories(schedule, settings),
    [schedule, settings],
  );

  return (
    <ToolsPageShell className="tools-page--tasks">
      <TasksContent
        tasks={tasks}
        categories={categories}
        createTask={createTask}
        updateTask={updateTask}
        deleteTask={deleteTask}
        deleteRecurringFuture={deleteRecurringFuture}
        reorderTasks={reorderTasks}
        completeTask={completeTask}
      />
    </ToolsPageShell>
  );
}
