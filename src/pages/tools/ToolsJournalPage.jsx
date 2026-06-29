import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import JournalContent from '@/components/tools/journal/JournalContent';
import { useToolsJournal } from '@/hooks/queries/useToolsJournal';

export default function ToolsJournalPage() {
  const {
    todayKey,
    todayEntry,
    entries,
    upsertEntry,
  } = useToolsJournal();

  return (
    <ToolsPageShell className="tools-page--journal">
      <JournalContent
        todayKey={todayKey}
        todayEntry={todayEntry}
        entries={entries}
        upsertEntry={upsertEntry}
      />
    </ToolsPageShell>
  );
}
