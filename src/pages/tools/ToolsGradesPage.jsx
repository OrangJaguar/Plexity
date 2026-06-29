import ToolsPageShell from '@/pages/tools/ToolsPageShell';
import GradesContent from '@/components/tools/grades/GradesContent';
import { useToolsGrades } from '@/hooks/queries/useToolsGrades';
import { useToolsSchedule } from '@/hooks/queries/useToolsSchedule';
import { useToolsSettings } from '@/hooks/queries/useToolsSettings';
import { getAllCategories } from '@/lib/tools/tools-settings';
import { useMemo } from 'react';

export default function ToolsGradesPage() {
  const {
    courses,
    periodSystem,
    saveCourses,
    saveDocument,
    upsertPeriodAssignments,
    updateCourse,
  } = useToolsGrades();
  const { data: schedule } = useToolsSchedule();
  const { settings } = useToolsSettings();

  const categorySuggestions = useMemo(
    () => getAllCategories(schedule, settings),
    [schedule, settings],
  );

  return (
    <ToolsPageShell className="tools-page--grades">
      <GradesContent
        courses={courses}
        periodSystem={periodSystem}
        categorySuggestions={categorySuggestions}
        saveCourses={saveCourses}
        saveDocument={saveDocument}
        upsertPeriodAssignments={upsertPeriodAssignments}
        updateCourse={updateCourse}
      />
    </ToolsPageShell>
  );
}
