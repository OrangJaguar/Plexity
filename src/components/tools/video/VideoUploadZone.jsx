import ToolsLocalDropzone from '@/components/tools/shared/ToolsLocalDropzone';

/**
 * @param {{
 *   accept: string,
 *   onFiles: (files: File[]) => void | Promise<void>,
 *   loading?: boolean,
 *   rejections?: ReadonlyArray<{ id: string, name: string, code: string, message: string }>,
 * }} props
 */
export default function VideoUploadZone({
  accept,
  onFiles,
  loading = false,
  rejections = [],
}) {
  return (
    <ToolsLocalDropzone
      title="Drag and drop video, audio, or images here"
      hint="Files stay on this device. Drop media to start editing."
      accept={accept}
      multiple
      loading={loading}
      onFiles={onFiles}
    >
      {rejections.length > 0 ? (
        <ul className="tools-video-rejections" aria-live="polite">
          {rejections.map((item) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </ToolsLocalDropzone>
  );
}
