import LegalPageShell from '@/pages/legal/LegalPageShell';

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service" updated="June 28, 2026">
      <p>
        Plexity is operated by Sanskar Gupta. By creating an account or using the service,
        you agree to these terms.
      </p>

      <h2>Using the service</h2>
      <p>
        You must provide accurate account information and keep your credentials secure.
        You are responsible for activity under your account. Do not use Plexity to store
        or transmit illegal content, attempt to access other users&apos; data, or disrupt the platform.
      </p>

      <h2>Your content</h2>
      <p>
        You retain ownership of the data you enter. You grant us the limited rights needed to host,
        sync, and display that data back to you through Base44 infrastructure. We do not sell your
        personal content.
      </p>

      <h2>Password vault</h2>
      <p>
        Credentials in the Passwords tool are encrypted in your browser before storage.
        If you lose your vault master password and recovery key, we cannot recover your vault contents.
      </p>

      <h2>Availability</h2>
      <p>
        We aim for reliable uptime but do not guarantee uninterrupted access. Features may change
        as the product evolves. Beta tools are provided as-is.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the service at any time. We may suspend accounts that violate these terms
        or pose a security risk.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: reach out through the contact information listed on the
        Plexity home page footer.
      </p>
    </LegalPageShell>
  );
}
