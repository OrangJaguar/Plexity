import ToolsLocalDropzone from '@/components/tools/shared/ToolsLocalDropzone';

/**
 * @param {object} props
 * @param {string} props.accept
 * @param {(files: File[]) => void | Promise<void>} props.onFiles
 * @param {() => void | Promise<void>} [props.onPaste]
 * @param {ReadonlyArray<{ id: string, name: string, code: string, message: string }>} props.rejections
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.compact]
 * @param {boolean} [props.canImportLinks]
 * @param {() => void} [props.onImportLinks]
 */
export default function ConverterUploadZone({
  accept,
  onFiles,
  onPaste,
  rejections,
  disabled = false,
  compact = false,
  canImportLinks = false,
  onImportLinks,
}) {
  return (
    <ToolsLocalDropzone
      title="Drag and drop files here"
      hint="Upload images, audio, video, or data files"
      accept={accept}
      multiple
      disabled={disabled}
      compact={compact}
      onFiles={onFiles}
      onClipboardPaste={onPaste}
      canImportLinks={canImportLinks}
      onImportLinks={onImportLinks}
    >
      {rejections.length > 0 && (
        <ul className="tools-converter-rejections" aria-live="polite">
          {rejections.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.message}</span>
              <code>{item.code}</code>
            </li>
          ))}
        </ul>
      )}
    </ToolsLocalDropzone>
  );
}
