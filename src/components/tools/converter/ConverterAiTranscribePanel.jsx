import { useState } from 'react';
import { useAdminConverterAiTranscribe } from '@/hooks/useAdminConverterAiTranscribe';

/**
 * Admin transcription / translate / subtitle download.
 */
export default function ConverterAiTranscribePanel() {
  const stt = useAdminConverterAiTranscribe();
  const [confirmed, setConfirmed] = useState(false);
  const [format, setFormat] = useState(/** @type {'vtt' | 'srt'} */ ('vtt'));

  return (
    <section className="tools-converter-ai-panel" aria-labelledby="converter-ai-stt-heading">
      <h2 id="converter-ai-stt-heading">AI transcription</h2>
      <p className="tools-converter-url-privacy">
        Admin-only. Audio/video for transcription is uploaded temporarily, processed in the cloud,
        then deleted. Video is demuxed to audio before STT. Confirm before each run.
      </p>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={stt.busy}
        />
        I confirm temporary cloud transcription for this media
      </label>
      <div className="tools-converter-url-actions">
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn-primary"
          disabled={stt.busy || !confirmed}
          onClick={() => void stt.runTranscribe()}
        >
          Transcribe
        </button>
        <button
          type="button"
          className="tools-converter-btn"
          disabled={stt.busy || !confirmed || !stt.cues?.length}
          onClick={() => void stt.translate('en')}
        >
          Translate cues
        </button>
        <label className="tools-converter-muted">
          Format{' '}
          <select
            value={format}
            onChange={(e) => setFormat(/** @type {'vtt' | 'srt'} */ (e.target.value))}
            disabled={stt.busy}
          >
            <option value="vtt">VTT</option>
            <option value="srt">SRT</option>
          </select>
        </label>
        <button
          type="button"
          className="tools-converter-btn"
          disabled={stt.busy || !stt.cues?.length}
          onClick={() => void stt.downloadSubtitles(format)}
        >
          Download subtitles
        </button>
      </div>
      {stt.error && <p className="tools-converter-error" role="alert">{stt.error}</p>}
      {stt.text && (
        <p className="tools-converter-muted" aria-live="polite">
          {stt.text.slice(0, 500)}
        </p>
      )}
    </section>
  );
}
