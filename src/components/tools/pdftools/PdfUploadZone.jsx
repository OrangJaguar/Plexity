import { useRef } from 'react';
import { Upload } from 'lucide-react';

/**
 * @param {{
 *   onFiles: (files: File[]) => void,
 *   multiFile?: boolean,
 *   hint?: string,
 *   loading?: boolean,
 *   fullWidth?: boolean,
 * }} props
 */
export default function PdfUploadZone({ onFiles, multiFile = false, hint, loading = false, fullWidth = false }) {
  const inputRef = useRef(null);

  const handleFiles = (list) => {
    const files = [...list].filter((f) =>
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (files.length) onFiles(files);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('pdf-upload-zone--drag');
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`pdf-upload-zone${fullWidth ? ' pdf-upload-zone--full' : ''}`}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('pdf-upload-zone--drag'); }}
      onDragLeave={(e) => e.currentTarget.classList.remove('pdf-upload-zone--drag')}
      onDrop={onDrop}
    >
      <Upload size={28} aria-hidden />
      <p className="pdf-upload-zone-title">
        {loading ? 'Loading PDF…' : 'Drag and drop PDF files here'}
      </p>
      <p className="pdf-upload-zone-hint">{hint}</p>
      <button
        type="button"
        className="pdf-btn pdf-btn--secondary"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        Select files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple={multiFile}
        hidden
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
