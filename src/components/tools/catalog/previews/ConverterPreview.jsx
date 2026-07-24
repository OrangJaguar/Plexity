import { FileImage, FileAudio, FileVideo, FileSpreadsheet, Shield } from 'lucide-react';

const CATEGORIES = [
  { label: 'Image', icon: FileImage, sample: 'PNG → WebP' },
  { label: 'Audio', icon: FileAudio, sample: 'WAV transform' },
  { label: 'Video', icon: FileVideo, sample: 'MP4 inspect' },
  { label: 'Data', icon: FileSpreadsheet, sample: 'CSV → JSON' },
];

export default function ConverterPreview() {
  return (
    <div className="tools-preview-scale tools-preview-converter">
      <div className="tools-converter-preview-shell">
        <div className="tools-converter-preview-hero">
          <p className="tools-converter-preview-kicker">Local conversion</p>
          <h3>Convert files in your browser</h3>
          <p className="tools-converter-preview-privacy">
            <Shield size={14} aria-hidden />
            Nothing is uploaded — processing stays on your device.
          </p>
        </div>
        <div className="tools-converter-preview-drop" tabIndex={-1} aria-hidden>
          Choose files
        </div>
        <ul className="tools-converter-preview-cats">
          {CATEGORIES.map(({ label, icon: Icon, sample }) => (
            <li key={label}>
              <Icon size={14} aria-hidden />
              <span>{label}</span>
              <em>{sample}</em>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
