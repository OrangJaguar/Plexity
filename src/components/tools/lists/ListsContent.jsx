import ListsWorkspace from '@/components/tools/lists/ListsWorkspace';

export default function ListsContent({ data, saveDocument }) {
  return (
    <div className="lists-tools-shell">
      <ListsWorkspace data={data} saveDocument={saveDocument} />
    </div>
  );
}
