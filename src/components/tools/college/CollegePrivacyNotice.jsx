import { Shield } from 'lucide-react';

export default function CollegePrivacyNotice({ compact = false }) {
  return (
    <div className={`college-privacy-notice${compact ? ' college-privacy-notice--compact' : ''}`}>
      <Shield size={compact ? 14 : 16} aria-hidden />
      <div>
        <strong>Planning &amp; drafting only</strong>
        <p>
          Use this workspace to organize your list, essays, and progress. Do not store sensitive
          details like full addresses, SSNs, or parent employer names here — gather those in
          Application info and submit through official portals.
        </p>
      </div>
    </div>
  );
}
