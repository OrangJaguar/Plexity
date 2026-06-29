import GoalsWorkspace from '@/components/tools/goals/GoalsWorkspace';

export default function GoalsContent({ data, saveDocument }) {
  return (
    <div className="goals-tools-shell">
      <GoalsWorkspace data={data} saveDocument={saveDocument} />
    </div>
  );
}
