import LegalPageShell from '@/pages/legal/LegalPageShell';

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" updated="August 6, 2026">
      <p>
        Plexity respects your privacy. This policy explains what we collect, how data is stored,
        and what stays on your device.
      </p>

      <h2>Account data</h2>
      <p>
        When you sign up, Supabase Auth handles authentication (email and account credentials).
        We store preferences tied to your account — pinned tools, theme, schedule, and similar settings —
        in our Postgres database with row-level security scoped to your user.
      </p>

      <h2>Cloud-synced tools</h2>
      <p>
        When signed in, your workspace syncs to Supabase with row-level security tied to your account:
        tasks, calendar, journal, focus sessions, goals, lists, grades, profile, college planner,
        calculator, stocks workspace, schedule, and preferences.
      </p>

      <h2>Device-only tools</h2>
      <p>
        Password vault entries are encrypted in your browser before storage — we only sync
        encrypted blobs and cannot read your secrets. PDF tools process files locally and never
        upload your documents to our servers. Browser-local converter/video/image tools process
        media on your device unless you use a separate server feature (currently disabled).
      </p>

      <h2>Analytics and errors</h2>
      <p>
        We may log anonymized product events and client errors to improve reliability.
        We do not use your journal, tasks, or vault contents for advertising.
      </p>

      <h2>Security</h2>
      <p>
        Database access uses row-level security so each user can only access their own records.
        Always sign out on shared devices.
      </p>

      <h2>Your choices</h2>
      <p>
        You can export or delete local data from your browser settings. To remove cloud data,
        delete your account or contact support.
      </p>
    </LegalPageShell>
  );
}
