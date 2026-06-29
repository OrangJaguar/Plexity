import ProfileWorkspace from '@/components/tools/profile/ProfileWorkspace';

export default function ProfileContent({ data, saveDocument }) {
  return (
    <div className="profile-tools-shell">
      <ProfileWorkspace data={data} saveDocument={saveDocument} />
    </div>
  );
}
