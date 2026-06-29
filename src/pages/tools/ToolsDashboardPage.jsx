import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import DashboardContent from '@/components/tools/dashboard/DashboardContent';
import { useToolsSchedule } from '@/hooks/queries/useToolsSchedule';
import { useToolsTasks } from '@/hooks/queries/useToolsTasks';
import { useToolsCalendarEvents } from '@/hooks/queries/useToolsCalendarEvents';

export default function ToolsDashboardPage() {
  const { data: schedule } = useToolsSchedule();
  const { tasks, completeTask } = useToolsTasks();
  const { events } = useToolsCalendarEvents();

  const handleCompleteTask = async (taskId) => {
    const task = tasks.find((t) => t.taskId === taskId);
    if (task) await completeTask(task, true);
  };

  return (
    <ToolsPageShell className="tools-page--dashboard">
      <DashboardContent
        schedule={schedule}
        tasks={tasks}
        events={events}
        onCompleteTask={handleCompleteTask}
      />
    </ToolsPageShell>
  );
}
