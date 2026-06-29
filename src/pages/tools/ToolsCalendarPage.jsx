import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import CalendarContent from '@/components/tools/calendar/CalendarContent';
import { useToolsCalendarEvents } from '@/hooks/queries/useToolsCalendarEvents';

export default function ToolsCalendarPage() {
  const { events, createEvent, updateEvent, deleteEvent } = useToolsCalendarEvents();

  return (
    <ToolsPageShell className="tools-page--calendar">
      <CalendarContent
        events={events}
        createEvent={createEvent}
        updateEvent={updateEvent}
        deleteEvent={deleteEvent}
      />
    </ToolsPageShell>
  );
}
