import ToolsLocalDropzone from '@/components/tools/shared/ToolsLocalDropzone';

/**
 * @param {object} props
 * @param {string} props.accept
 * @param {(files: File[]) => void | Promise<void>} props.onFiles
 * @param {() => void | Promise<void>} [props.onPaste]
 * @param {ReadonlyArray<{ id: string, name: string, code: string, message: string }>} props.rejections
 * @param {boolean} [props.disabled]
 */
export default function ImageUploadZone({
  accept,
  onFiles,
  onPaste,
  rejections,
  disabled = false,
}) {
  return (
    <ToolsLocalDropzone
      title="Drag and drop images here"
      hint="PNG, JPEG, WebP, GIF, BMP — editing stays on your device"
      accept={accept}
      multiple
      disabled={disabled}
      onFiles={onFiles}
      onClipboardPaste={onPaste}
    >
      {rejections.length > 0 && (
        <ul className="tools-image-rejections" aria-live="polite">
          {rejections.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      )}
    </ToolsLocalDropzone>
  );
}
