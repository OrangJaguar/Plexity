import ToolsLocalDropzone from '@/components/tools/shared/ToolsLocalDropzone';

/**
 * @param {{
 *   onFiles: (files: File[]) => void,
 *   multiFile?: boolean,
 *   hint?: string,
 *   loading?: boolean,
 *   fullWidth?: boolean,
 * }} props
 */
export default function PdfUploadZone({
  onFiles,
  multiFile = false,
  hint = 'Upload one or more PDF files',
  loading = false,
  fullWidth = false,
}) {
  return (
    <ToolsLocalDropzone
      title="Drag and drop PDF files here"
      hint={hint}
      accept="application/pdf,.pdf"
      multiple={multiFile}
      loading={loading}
      compact={!fullWidth}
      onFiles={(files) => {
        const pdfs = files.filter((f) =>
          f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (pdfs.length) onFiles(pdfs);
      }}
    />
  );
}
