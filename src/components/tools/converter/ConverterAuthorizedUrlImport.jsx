import { useRef, useState } from 'react';
import { useAdminConverterUrlWorkspace } from '@/hooks/useAdminConverterUrlWorkspace';
import ConverterUrlReviewPanel from '@/components/tools/converter/ConverterUrlReviewPanel';
import ConverterRemoteJobQueue from '@/components/tools/converter/ConverterRemoteJobQueue';

/**
 * Admin-only Authorized URL Import panel.
 * Loaded dynamically so the public converter bundle never statically includes it.
 */
export default function ConverterAuthorizedUrlImport({ defaultPlan = null, defaultOpen = true }) {
  const {
    reviewSession,
    remoteJobs,
    statusMessage,
    busy,
    error,
    requiresYouTubeAck,
    canConfirm,
    importFromText,
    importFromCsv,
    setAck,
    validateWithServer,
    confirmAndCreate,
    cancelRemoteJob,
    retryRemoteJob,
    downloadRemoteJob,
    clearReview,
  } = useAdminConverterUrlWorkspace();

  const [pasteText, setPasteText] = useState('');
  const [open, setOpen] = useState(defaultOpen);
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const handleFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    const name = String(file.name || '').toLowerCase();
    if (name.endsWith('.csv')) importFromCsv(text);
    else importFromText(text);
  };

  const handleConfirm = () => {
    const plan = defaultPlan && typeof defaultPlan === 'object'
      ? defaultPlan
      : { operationId: 'video-to-mp4', schemaVersion: 2 };
    confirmAndCreate(plan);
  };

  return (
    <section className="tools-converter-url-import" aria-labelledby="converter-url-import-heading">
      <div className="tools-converter-url-import-header">
        <h2 id="converter-url-import-heading">Import links</h2>
        <button
          type="button"
          className="tools-converter-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open && (
        <>
          <p className="tools-converter-url-privacy">
            Admin only: authorized remote URLs are fetched and converted on temporary private
            servers, then deleted automatically. Do not submit URLs you are not permitted to process.
            Local file conversion above remains entirely on this device.
          </p>

          <label className="tools-converter-url-paste-label" htmlFor="converter-url-paste">
            Paste URLs (one per line)
          </label>
          <textarea
            id="converter-url-paste"
            className="tools-converter-url-paste"
            rows={4}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="https://example.com/media.mp4"
            disabled={busy}
          />
          <div className="tools-converter-url-actions">
            <button
              type="button"
              className="tools-converter-btn tools-converter-btn-primary"
              disabled={busy || !pasteText.trim()}
              onClick={() => importFromText(pasteText)}
            >
              Review pasted URLs
            </button>
            <button
              type="button"
              className="tools-converter-btn"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              Import TXT / CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {statusMessage && (
            <p className="tools-converter-live" aria-live="polite">{statusMessage}</p>
          )}
          {error && (
            <p className="tools-converter-error" role="alert">{error}</p>
          )}

          {reviewSession && (
            <ConverterUrlReviewPanel
              session={reviewSession}
              requiresYouTubeAck={requiresYouTubeAck}
              canConfirm={canConfirm}
              busy={busy}
              onAck={setAck}
              onValidate={validateWithServer}
              onConfirm={handleConfirm}
              onClear={clearReview}
            />
          )}

          <ConverterRemoteJobQueue
            jobs={remoteJobs}
            busy={busy}
            onCancel={cancelRemoteJob}
            onRetry={retryRemoteJob}
            onDownload={downloadRemoteJob}
          />
        </>
      )}
    </section>
  );
}
