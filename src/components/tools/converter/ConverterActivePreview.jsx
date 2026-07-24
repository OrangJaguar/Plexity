import { JOB_STATUS } from '@/lib/tools/converter/converter-job-model.js';
import {
  formatByteSize,
  formatDimensions,
  formatDuration,
} from '@/components/tools/converter/converter-ui-utils';

/**
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} job
 * @returns {string}
 */
function buildPreviewMeta(job) {
  const category = String(job.analysis?.category ?? job.source.category ?? '');
  const format = (job.source.detectedFormat ?? job.analysis?.format ?? '').toUpperCase() || null;
  const size = formatByteSize(job.source.size);
  const label = category ? category.charAt(0).toUpperCase() + category.slice(1) : null;

  if (category === 'image') {
    const dims = formatDimensions(
      Number(job.analysis?.width ?? 0),
      Number(job.analysis?.height ?? 0),
    );
    return [label, format, size, dims].filter(Boolean).join(' · ');
  }

  if (category === 'video') {
    const duration = formatDuration(Number(job.analysis?.durationSec ?? 0));
    const dims = formatDimensions(
      Number(job.analysis?.width ?? 0),
      Number(job.analysis?.height ?? 0),
    );
    return [label, format, size, duration, dims].filter(Boolean).join(' · ');
  }

  if (category === 'audio') {
    const duration = formatDuration(Number(job.analysis?.durationSec ?? 0));
    const rate = Number(job.analysis?.sampleRate ?? 0);
    const channels = Number(job.analysis?.channels ?? 0);
    const rateLabel = rate > 0 ? `${Math.round(rate / 1000)} kHz` : null;
    const channelLabel = channels === 1 ? 'Mono' : channels === 2 ? 'Stereo' : channels > 0 ? `${channels} ch` : null;
    return [label, format, size, duration, rateLabel, channelLabel].filter(Boolean).join(' · ');
  }

  if (category === 'data') {
    const rows = Number(job.analysis?.rowCount ?? 0);
    const cols = Number(job.analysis?.columnCount ?? 0);
    const shape = rows > 0 && cols > 0
      ? `${rows}×${cols}`
      : rows > 0
        ? `${rows} rows`
        : cols > 0
          ? `${cols} cols`
          : null;
    return [label, format, size, shape].filter(Boolean).join(' · ');
  }

  return [label, format, size].filter(Boolean).join(' · ');
}

/**
 * Preview stage: header + media that fills available height (object-fit contain).
 *
 * @param {{
 *   job: import('@/lib/tools/converter/converter-job-model.js').ConverterJob | null,
 *   sourceUrl: string | null,
 * }} props
 */
export default function ConverterActivePreview({ job, sourceUrl }) {
  if (!job) {
    return (
      <div className="converter-preview-empty">
        <p>Select a file to preview</p>
      </div>
    );
  }

  const category = String(job.analysis?.category ?? job.source.category ?? '');
  const mime = job.source.mimeType ?? '';
  const format = String(job.source.detectedFormat ?? job.analysis?.format ?? '').toLowerCase();
  const resultUrl = job.output?.objectUrl ?? null;
  const showResult = Boolean(resultUrl) && job.status === JOB_STATUS.COMPLETED;
  const quality = Number(job.options?.quality);
  const qualityValue = Number.isFinite(quality) ? quality : 0.92;
  const sizeBias = Number(job.options?.sizeBias);
  const previewBias = showResult
    ? 0
    : Number.isFinite(sizeBias)
      ? sizeBias
      : (qualityValue - 0.92) / 0.72;

  const isVideo = category === 'video'
    || mime.startsWith('video/')
    || ['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'mpeg', 'mpg'].includes(format);
  const isAudio = !isVideo && (
    category === 'audio'
    || mime.startsWith('audio/')
    || ['wav', 'mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus'].includes(format)
  );
  const isImage = category === 'image' || mime.startsWith('image/');

  return (
    <div className="converter-preview-stage">
      <div className="converter-preview-stage-header">
        <div>
          <h2 className="converter-preview-filename">{job.source.name}</h2>
          <p className="pdf-side-hint">{buildPreviewMeta(job)}</p>
        </div>
        {job.status === JOB_STATUS.FAILED && (
          <p className="pdf-side-error" role="alert">
            {job.error?.message || 'Conversion failed'}
          </p>
        )}
      </div>

      <div className="converter-preview-media-wrap">
        {showResult ? (
          <ResultMedia url={resultUrl} mime={job.output?.mimeType ?? ''} name={job.output?.fileName ?? 'output'} />
        ) : (
          <SourceMedia
            url={sourceUrl}
            isImage={isImage}
            isAudio={isAudio}
            isVideo={isVideo}
            name={job.source.name}
            bias={previewBias}
          />
        )}
      </div>

      {showResult && (
        <p className="converter-preview-caption">
          Converted · {job.output?.fileName}
          {job.output?.size != null ? ` · ${formatByteSize(job.output.size)}` : ''}
        </p>
      )}
    </div>
  );
}

/**
 * Blur when compressing; slight contrast/saturation lift when improving.
 * Soft blur reads better than pixelation for a continuous slider.
 */
function qualityPreviewStyle(bias) {
  const b = Number.isFinite(bias) ? Math.min(1, Math.max(-1, bias)) : 0;
  if (b < -0.02) {
    const compress = -b;
    const blur = compress * 6;
    const contrast = 1 - compress * 0.1;
    return {
      filter: `blur(${blur.toFixed(2)}px) contrast(${contrast.toFixed(3)})`,
    };
  }
  if (b > 0.02) {
    const boost = b;
    const contrast = 1 + boost * 0.12;
    const saturate = 1 + boost * 0.1;
    const brightness = 1 + boost * 0.03;
    return {
      filter: `contrast(${contrast.toFixed(3)}) saturate(${saturate.toFixed(3)}) brightness(${brightness.toFixed(3)})`,
    };
  }
  return undefined;
}

function SourceMedia({ url, isImage, isAudio, isVideo, name, bias }) {
  if (!url) {
    return <p className="pdf-side-hint">Preparing preview…</p>;
  }
  if (isImage) {
    return (
      <div className="converter-preview-image-frame">
        <img
          src={url}
          alt={name}
          className="converter-preview-media converter-preview-media--image"
          style={qualityPreviewStyle(bias)}
        />
      </div>
    );
  }
  if (isVideo) {
    return (
      <video controls src={url} className="converter-preview-media converter-preview-media--video" playsInline>
        Video preview
      </video>
    );
  }
  if (isAudio) {
    return (
      <audio controls src={url} className="converter-preview-media">
        Audio preview
      </audio>
    );
  }
  return (
    <div className="converter-preview-data">
      <p className="pdf-side-hint">Data file ready to convert</p>
      <p className="converter-preview-filename">{name}</p>
    </div>
  );
}

function ResultMedia({ url, mime, name }) {
  if (mime.startsWith('image/')) {
    return (
      <div className="converter-preview-image-frame">
        <img src={url} alt={name} className="converter-preview-media converter-preview-media--image" />
      </div>
    );
  }
  if (mime.startsWith('video/')) {
    return (
      <video controls src={url} className="converter-preview-media converter-preview-media--video" playsInline>
        Video preview
      </video>
    );
  }
  if (mime.startsWith('audio/')) {
    return (
      <audio controls src={url} className="converter-preview-media">
        Audio preview
      </audio>
    );
  }
  return (
    <div className="converter-preview-data">
      <p className="pdf-side-hint">Conversion complete</p>
      <p className="converter-preview-filename">{name}</p>
    </div>
  );
}
