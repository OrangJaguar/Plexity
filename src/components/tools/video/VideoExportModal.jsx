import { useEffect, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { cancelVideoExport, exportVideoProject, planExport } from '@/lib/tools/video/video-export.js';
import {
  VIDEO_EXPORT_PRESETS,
  applyPresetToProject,
  getExportPreset,
} from '@/lib/tools/video/video-export-presets.js';
import { exportProjectSrt } from '@/lib/tools/video/video-captions.js';

/**
 * @param {object} props
 */
export default function VideoExportModal({ project, open, onClose }) {
  const [presetId, setPresetId] = useState('class-1080p');
  const [format, setFormat] = useState(/** @type {'mp4'|'webm'|'mp3'} */ ('mp4'));
  const [includeSrt, setIncludeSrt] = useState(true);
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(/** @type {'idle'|'running'|'done'|'error'} */ ('idle'));
  const [error, setError] = useState('');
  const [result, setResult] = useState(
    /** @type {{ blob: Blob, fileName: string, mimeType: string, srtText?: string } | null} */ (null),
  );
  const abortRef = useRef(/** @type {AbortController | null} */ (null));

  const preset = getExportPreset(presetId);
  const exportProject = applyPresetToProject(project, presetId);
  const plan = planExport(exportProject, { audioOnly: preset.audioOnly, presetId });

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setStatus('idle');
      setProgress(0);
      setError('');
      setResult(null);
    }
  }, [open]);

  useEffect(() => {
    if (preset.audioOnly) setFormat('mp3');
    else if (format === 'mp3') setFormat(/** @type {'mp4'} */ (preset.format || 'mp4'));
  }, [presetId, preset.audioOnly, preset.format, format]);

  if (!open) return null;

  const runExport = async () => {
    setStatus('running');
    setError('');
    setProgress(0);
    setResult(null);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const out = await exportVideoProject(exportProject, {
        format: preset.audioOnly ? 'mp3' : format,
        audioOnly: preset.audioOnly,
        burnCaptions: preset.audioOnly ? false : burnCaptions,
        includeSrt,
        presetId,
        signal: ac.signal,
        onProgress: (r) => setProgress(Math.min(1, Math.max(0, r))),
      });
      setResult(out);
      setStatus('done');
      setProgress(1);
    } catch (err) {
      if (ac.signal.aborted || err?.code === 'CANCELLED') {
        setStatus('idle');
        setError('');
      } else {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Export failed.');
      }
    } finally {
      abortRef.current = null;
    }
  };

  const cancel = async () => {
    abortRef.current?.abort();
    await cancelVideoExport();
    setStatus('idle');
    setProgress(0);
  };

  const download = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSrt = () => {
    const text = result?.srtText || exportProjectSrt(project);
    if (!text) return;
    download(new Blob([text], { type: 'text/plain' }), `${project.title || 'captions'}.srt`);
  };

  const canStart = plan.videoCount > 0 || plan.audioCount > 0;

  return (
    <div className="tools-video-export-backdrop" role="presentation" onClick={onClose}>
      <div
        className="tools-video-export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-export-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tools-video-export-head">
          <h2 id="video-export-title">Export</h2>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <label className="tools-video-field">
          <span>Preset</span>
          <select
            value={presetId}
            disabled={status === 'running'}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {VIDEO_EXPORT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        <p className="tools-video-export-meta">
          {preset.audioOnly
            ? `${plan.audioCount} audio · ${(plan.totalDurationMs / 1000).toFixed(1)}s`
            : `${plan.videoCount} video · ${plan.audioCount} audio · ${(plan.totalDurationMs / 1000).toFixed(1)}s · ${exportProject.width}×${exportProject.height}`}
        </p>

        {plan.checklist?.length ? (
          <ul className="tools-video-export-checklist">
            {plan.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {!preset.audioOnly ? (
          <label className="tools-video-field">
            <span>Format</span>
            <select
              value={format}
              disabled={status === 'running'}
              onChange={(e) => setFormat(/** @type {'mp4'|'webm'} */ (e.target.value))}
            >
              <option value="mp4">MP4</option>
              <option value="webm">WebM</option>
            </select>
          </label>
        ) : null}

        <label className="tools-video-field tools-video-field--check">
          <span>
            <input
              type="checkbox"
              checked={includeSrt}
              disabled={status === 'running'}
              onChange={(e) => setIncludeSrt(e.target.checked)}
            />
            {' '}Download SRT sidecar
          </span>
        </label>
        {!preset.audioOnly ? (
          <label className="tools-video-field tools-video-field--check">
            <span>
              <input
                type="checkbox"
                checked={burnCaptions}
                disabled={status === 'running'}
                onChange={(e) => setBurnCaptions(e.target.checked)}
              />
              {' '}Burn-in captions
            </span>
          </label>
        ) : null}

        {status === 'running' ? (
          <div className="tools-video-export-progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        ) : null}
        {error ? <p className="tools-video-export-error">{error}</p> : null}
        <div className="tools-video-export-actions">
          {status === 'running' ? (
            <button type="button" className="pdf-btn pdf-btn--secondary" onClick={() => void cancel()}>
              Cancel
            </button>
          ) : (
            <button type="button" className="pdf-btn pdf-btn--primary" onClick={() => void runExport()} disabled={!canStart}>
              {status === 'done' ? 'Export again' : 'Start export'}
            </button>
          )}
          {result ? (
            <button type="button" className="pdf-btn pdf-btn--secondary" onClick={() => download(result.blob, result.fileName)}>
              <Download size={14} />
              Download
            </button>
          ) : null}
          {result && includeSrt ? (
            <button type="button" className="pdf-btn pdf-btn--ghost" onClick={downloadSrt}>
              Download SRT
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
