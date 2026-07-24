import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Columns2, GitCompare, X } from 'lucide-react';

/**
 * @param {object} props
 * @param {import('@/lib/tools/converter/converter-job-model.js').ConverterJob} props.job
 * @param {string} [props.sourceUrl]
 * @param {string} [props.outputUrl]
 * @param {() => void} [props.onClose]
 */
export default function ConverterComparePane({ job, sourceUrl, outputUrl, onClose }) {
  const output = job.output;
  const mime = output?.mimeType ?? '';
  const category = String(job.analysis?.category ?? '');
  const closeRef = useRef(/** @type {HTMLButtonElement | null} */(null));

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  if (!outputUrl && !output?.objectUrl) return null;

  const resolvedOutputUrl = outputUrl ?? output?.objectUrl ?? '';
  const isImage = mime.startsWith('image/') || category === 'image';
  const isAudio = mime.startsWith('audio/') || category === 'audio';
  const isVideo = mime.startsWith('video/') || category === 'video';

  return (
    <aside
      className="tools-converter-compare"
      aria-label={`Compare ${job.source.name}`}
    >
      <header className="tools-converter-compare-header">
        <GitCompare size={18} aria-hidden />
        <div>
          <h3>Compare</h3>
          <p>{job.source.name} → {output?.fileName}</p>
        </div>
        {onClose && (
          <button
            ref={closeRef}
            type="button"
            className="tools-converter-btn tools-converter-btn--ghost tools-converter-compare-close"
            onClick={onClose}
            aria-label="Close compare pane"
          >
            <X size={16} aria-hidden />
          </button>
        )}
      </header>

      {isImage && (
        <ImageCompare sourceUrl={sourceUrl} outputUrl={resolvedOutputUrl} fileName={job.source.name} />
      )}
      {isAudio && (
        <AudioCompare sourceUrl={sourceUrl} outputUrl={resolvedOutputUrl} />
      )}
      {isVideo && (
        <VideoCompare sourceUrl={sourceUrl} outputUrl={resolvedOutputUrl} fileName={output?.fileName ?? ''} />
      )}
      {!isImage && !isAudio && !isVideo && (
        <p className="tools-converter-compare-fallback">
          Side-by-side preview is unavailable for this format. Download or share from the job actions.
        </p>
      )}
    </aside>
  );
}

/**
 * @param {object} props
 * @param {string | undefined} props.sourceUrl
 * @param {string} props.outputUrl
 * @param {string} props.fileName
 */
function ImageCompare({ sourceUrl, outputUrl, fileName }) {
  const [mode, setMode] = useState(sourceUrl ? 'slider' : 'output');
  const [slider, setSlider] = useState(50);

  return (
    <div className="tools-converter-compare-image">
      <div className="tools-converter-compare-mode" role="tablist" aria-label="Compare mode">
        {sourceUrl && (
          <>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'slider'}
              className={`tools-converter-btn${mode === 'slider' ? ' tools-converter-btn--primary' : ''}`}
              onClick={() => setMode('slider')}
            >
              Slider
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'side'}
              className={`tools-converter-btn${mode === 'side' ? ' tools-converter-btn--primary' : ''}`}
              onClick={() => setMode('side')}
            >
              <Columns2 size={14} aria-hidden />
              Side by side
            </button>
          </>
        )}
      </div>

      {mode === 'side' && sourceUrl ? (
        <div className="tools-converter-compare-side-by-side">
          <figure>
            <figcaption>Source</figcaption>
            <img src={sourceUrl} alt={`Source: ${fileName}`} className="tools-converter-compare-media" />
          </figure>
          <figure>
            <figcaption>Output</figcaption>
            <img src={outputUrl} alt={`Output: ${fileName}`} className="tools-converter-compare-media" />
          </figure>
        </div>
      ) : sourceUrl ? (
        <div
          className="tools-converter-compare-slider"
          style={{ '--compare-split': `${slider}%` }}
        >
          <img src={outputUrl} alt={`Output: ${fileName}`} className="tools-converter-compare-media tools-converter-compare-media--base" />
          <div className="tools-converter-compare-slider-overlay">
            <img src={sourceUrl} alt={`Source: ${fileName}`} className="tools-converter-compare-media" />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={slider}
            className="tools-converter-compare-slider-input"
            aria-label="Compare slider position"
            onChange={(event) => setSlider(Number(event.target.value))}
          />
        </div>
      ) : (
        <img src={outputUrl} alt={`Output: ${fileName}`} className="tools-converter-compare-media" />
      )}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string | undefined} props.sourceUrl
 * @param {string} props.outputUrl
 */
function AudioCompare({ sourceUrl, outputUrl }) {
  const audioRef = useRef(/** @type {HTMLAudioElement | null} */(null));
  const [active, setActive] = useState(/** @type {'source' | 'output'} */('output'));

  const activeUrl = useMemo(
    () => (active === 'source' && sourceUrl ? sourceUrl : outputUrl),
    [active, outputUrl, sourceUrl],
  );

  const switchTrack = useCallback((next) => {
    setActive(next);
    const node = audioRef.current;
    if (!node) return;
    const time = node.currentTime;
    node.src = next === 'source' && sourceUrl ? sourceUrl : outputUrl;
    node.currentTime = Math.min(time, node.duration || time);
    void node.play().catch(() => {});
  }, [outputUrl, sourceUrl]);

  return (
    <div className="tools-converter-compare-audio">
      <div className="tools-converter-compare-ab" role="group" aria-label="Audio A/B compare">
        <button
          type="button"
          className={`tools-converter-btn${active === 'source' ? ' tools-converter-btn--primary' : ''}`}
          disabled={!sourceUrl}
          onClick={() => switchTrack('source')}
        >
          Source
        </button>
        <button
          type="button"
          className={`tools-converter-btn${active === 'output' ? ' tools-converter-btn--primary' : ''}`}
          onClick={() => switchTrack('output')}
        >
          Output
        </button>
      </div>
      <audio ref={audioRef} controls src={activeUrl} className="tools-converter-compare-media">
        Audio compare
      </audio>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string | undefined} props.sourceUrl
 * @param {string} props.outputUrl
 * @param {string} props.fileName
 */
function VideoCompare({ sourceUrl, outputUrl, fileName }) {
  return (
    <div className="tools-converter-compare-video">
      <video
        controls
        preload="metadata"
        src={outputUrl}
        className="tools-converter-compare-media tools-converter-compare-video-main"
      >
        Video compare
      </video>
      {sourceUrl && (
        <details className="tools-converter-compare-source-video">
          <summary>View source clip</summary>
          <video controls preload="metadata" src={sourceUrl} className="tools-converter-compare-media">
            Source video
          </video>
        </details>
      )}
      <p className="tools-converter-compare-caption">{fileName}</p>
    </div>
  );
}
