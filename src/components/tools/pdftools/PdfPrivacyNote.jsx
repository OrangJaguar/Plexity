import { Shield } from 'lucide-react';

export default function PdfPrivacyNote({ compact = false }) {
  return (
    <div className={`pdf-privacy-note${compact ? ' pdf-privacy-note--compact' : ''}`}>
      <Shield size={compact ? 14 : 16} aria-hidden />
      <p>
        Processed locally in your browser — your files never leave your device and no data is sent to our servers.
      </p>
    </div>
  );
}
