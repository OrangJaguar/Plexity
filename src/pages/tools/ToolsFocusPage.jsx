import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import FocusContent from '@/components/tools/focus/FocusContent';
import { useToolsTasks } from '@/hooks/queries/useToolsTasks';
import { useToolsCalendarEvents } from '@/hooks/queries/useToolsCalendarEvents';

export default function ToolsFocusPage() {
  const { tasks } = useToolsTasks();
  const { events } = useToolsCalendarEvents();

  return (
    <ToolsPageShell className="tools-page--focus">
      <FocusContent tasks={tasks} events={events} />
    </ToolsPageShell>
  );
}
