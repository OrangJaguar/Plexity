import { useEffect, useRef, useState } from 'react';
import { Link2, Upload } from 'lucide-react';
import clsx from 'clsx';

/**
 * Shared empty-state dropzone for local-only tools (PDF, Converter).
 * Outer solid card + inner dashed drop area (matches PDF empty-state screenshot).
 *
 * @param {{
 *   title: string,
 *   hint: string,
 *   accept: string,
 *   multiple?: boolean,
 *   loading?: boolean,
 *   disabled?: boolean,
 *   compact?: boolean,
 *   onFiles: (files: File[]) => void | Promise<void>,
 *   onClipboardPaste?: () => void | Promise<void>,
 *   canImportLinks?: boolean,
 *   onImportLinks?: () => void,
 *   children?: import('react').ReactNode,
 * }} props
 */
export default function ToolsLocalDropzone({
  title,
  hint,
  accept,
  multiple = true,
  loading = false,
  disabled = false,
  compact = false,
  onFiles,
  onClipboardPaste,
  canImportLinks = false,
  onImportLinks,
  children,
}) {
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const dragDepthRef = useRef(0);
  const onFilesRef = useRef(onFiles);
  const onClipboardPasteRef = useRef(onClipboardPaste);
  const [dragOver, setDragOver] = useState(false);

  onFilesRef.current = onFiles;
  onClipboardPasteRef.current = onClipboardPaste;

  const handleFiles = (list) => {
    if (disabled || loading || !list?.length) return;
    const files = [...list];
    if (files.length) void onFilesRef.current(files);
  };

  useEffect(() => {
    const onPaste = (event) => {
      if (disabled || loading) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }

      const fileList = event.clipboardData?.files;
      if (fileList?.length) {
        event.preventDefault();
        handleFiles(fileList);
        return;
      }

      if (onClipboardPasteRef.current) {
        event.preventDefault();
        void onClipboardPasteRef.current();
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [disabled, loading]);

  return (
    <div
      className={clsx(
        'tools-local-dropzone-card',
        compact && 'tools-local-dropzone-card--compact',
        dragOver && 'tools-local-dropzone-card--drag',
      )}
    >
      <section
        className={clsx(
          'tools-local-dropzone',
          compact && 'tools-local-dropzone--compact',
          dragOver && 'tools-local-dropzone--drag',
        )}
        aria-label={title}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepthRef.current += 1;
          setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepthRef.current = 0;
          setDragOver(false);
          handleFiles(event.dataTransfer?.files);
        }}
      >
        <Upload size={compact ? 22 : 28} aria-hidden />
        <p className="tools-local-dropzone-title">
          {loading ? 'Loading…' : title}
        </p>
        <p className="tools-local-dropzone-hint">{hint}</p>

        <div className="tools-local-dropzone-actions">
          <button
            type="button"
            className="tools-local-dropzone-btn"
            disabled={disabled || loading}
            onClick={() => inputRef.current?.click()}
          >
            Select files
          </button>
          {canImportLinks && (
            <button
              type="button"
              className="tools-local-dropzone-btn"
              disabled={disabled || loading}
              onClick={() => onImportLinks?.()}
            >
              <Link2 size={16} aria-hidden />
              Import links
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          className="tools-local-dropzone-input"
          accept={accept}
          multiple={multiple}
          disabled={disabled || loading}
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = '';
          }}
        />

        {children}
      </section>
    </div>
  );
}
