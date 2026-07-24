import { useEffect, useMemo, useState } from 'react';
import {
  escapePreviewText,
  formatByteSize,
  formatDimensions,
  formatDuration,
} from '@/components/tools/converter/converter-ui-utils';
import { formatChecksumShort } from '@/lib/tools/converter/checksums.js';

const TEXT_PREVIEW_LIMIT = 4000;

/**
 * @param {object} props
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterOutputDescriptor | null | undefined} props.output
 * @param {Record<string, unknown> | null | undefined} props.analysis
 * @param {string} [props.category]
 * @param {{ bytes?: number | null, uncertainty?: string } | null} [props.estimate]
 * @param {string | null} [props.checksum]
 */
export default function ConverterResultPreview({ output, analysis, category, estimate, checksum }) {
  if (!output?.objectUrl) {
    return null;
  }

  const mime = output.mimeType ?? '';
  const meta = analysis ?? {};
  const outputDims = formatDimensions(
    /** @type {number | undefined} */ (meta.outputWidth ?? meta.width),
    /** @type {number | undefined} */ (meta.outputHeight ?? meta.height),
  );
  const duration = formatDuration(/** @type {number | undefined} */ (meta.durationSec));
  const metaLine = [
    outputDims,
    duration,
    formatByteSize(output.size),
  ].filter(Boolean).join(' · ');

  const estimateLine = estimate?.bytes != null
    ? `Est. ${formatByteSize(estimate.bytes)}${estimate.uncertainty ? ` (${estimate.uncertainty})` : ''}`
    : null;

  const thumbnailUrl = typeof meta.thumbnail === 'string' ? meta.thumbnail : null;

  const badges = (
    <div className="tools-converter-preview-badges">
      {estimateLine && (
        <span className="tools-converter-preview-badge">{estimateLine}</span>
      )}
      {checksum && (
        <span className="tools-converter-preview-badge tools-converter-preview-badge--checksum" title={checksum}>
          SHA {formatChecksumShort(checksum)}
        </span>
      )}
    </div>
  );

  if (mime.startsWith('image/')) {
    return (
      <div className="tools-converter-preview tools-converter-preview--image">
        <img
          src={output.objectUrl}
          alt={`Converted preview: ${output.fileName}`}
          className="tools-converter-preview-media"
        />
        <p className="tools-converter-preview-meta">{output.fileName}{metaLine ? ` · ${metaLine}` : ''}</p>
        {badges}
      </div>
    );
  }

  if (mime.startsWith('audio/')) {
    return (
      <div className="tools-converter-preview tools-converter-preview--audio">
        <audio controls src={output.objectUrl} className="tools-converter-preview-media">
          Audio preview
        </audio>
        <p className="tools-converter-preview-meta">{output.fileName}{metaLine ? ` · ${metaLine}` : ''}</p>
        {badges}
      </div>
    );
  }

  if (mime.startsWith('video/') || category === 'video') {
    const playable = mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/quicktime';
    return (
      <div className="tools-converter-preview tools-converter-preview--video">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Video thumbnail for ${output.fileName}`}
            className="tools-converter-preview-thumb"
          />
        ) : null}
        {playable ? (
          <video
            controls
            preload="metadata"
            poster={thumbnailUrl ?? undefined}
            src={output.objectUrl}
            className="tools-converter-preview-media"
          >
            Video preview
          </video>
        ) : (
          <p className="tools-converter-preview-meta">
            Playback is unavailable for this output format — download to open in another app.
          </p>
        )}
        <p className="tools-converter-preview-meta">{output.fileName}{metaLine ? ` · ${metaLine}` : ''}</p>
        {badges}
      </div>
    );
  }

  return (
    <DataTextPreview
      objectUrl={output.objectUrl}
      fileName={output.fileName}
      metaLine={metaLine}
      badges={badges}
    />
  );
}

/**
 * @param {object} props
 * @param {string} props.objectUrl
 * @param {string} props.fileName
 * @param {string} props.metaLine
 * @param {import('react').ReactNode} props.badges
 */
function DataTextPreview({ objectUrl, fileName, metaLine, badges }) {
  const text = useTextPreview(objectUrl);
  const escaped = useMemo(() => escapePreviewText(text), [text]);

  return (
    <div className="tools-converter-preview tools-converter-preview--data">
      <p className="tools-converter-preview-meta">{fileName}{metaLine ? ` · ${metaLine}` : ''}</p>
      {badges}
      <pre
        className="tools-converter-preview-text"
        dangerouslySetInnerHTML={{ __html: escaped || 'Loading preview…' }}
      />
    </div>
  );
}

/**
 * @param {string} objectUrl
 */
function useTextPreview(objectUrl) {
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    setText('');
    fetch(objectUrl)
      .then((res) => res.text())
      .then((value) => {
        if (cancelled) return;
        const trimmed = value.length > TEXT_PREVIEW_LIMIT
          ? `${value.slice(0, TEXT_PREVIEW_LIMIT)}\n…`
          : value;
        setText(trimmed);
      })
      .catch(() => {
        if (!cancelled) setText('Preview unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [objectUrl]);

  return text;
}
