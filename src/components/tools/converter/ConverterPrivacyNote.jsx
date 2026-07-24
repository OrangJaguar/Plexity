import { Shield } from 'lucide-react';

/** Same privacy banner styling as PDF tools. */
export default function ConverterPrivacyNote() {
  return (
    <div className="pdf-privacy-note">
      <Shield size={16} aria-hidden />
      <p>
        Processed locally in your browser — your files never leave your device and no data is sent to our servers.
      </p>
    </div>
  );
}
