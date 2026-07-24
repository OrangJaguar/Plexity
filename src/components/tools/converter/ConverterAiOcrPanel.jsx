import { useState } from 'react';
import ConverterAiReviewCard from '@/components/tools/converter/ConverterAiReviewCard';
import { useAdminConverterAiOcr } from '@/hooks/useAdminConverterAiOcr';

/**
 * Admin OCR / table / alt-text panel.
 */
export default function ConverterAiOcrPanel() {
  const ocr = useAdminConverterAiOcr();
  const [confirmed, setConfirmed] = useState(false);

  return (
    <section className="tools-converter-ai-panel" aria-labelledby="converter-ai-ocr-heading">
      <h2 id="converter-ai-ocr-heading">AI OCR</h2>
      <p className="tools-converter-url-privacy">
        Admin-only. Images for OCR are uploaded temporarily to secure storage, processed, then wiped
        (about 15 minutes). Confirm before each paid OCR action.
      </p>
      <label className="tools-converter-url-ack">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          disabled={ocr.busy}
        />
        I understand temporary cloud processing and confirm this OCR run
      </label>
      <div className="tools-converter-url-actions">
        <button
          type="button"
          className="tools-converter-btn tools-converter-btn-primary"
          disabled={ocr.busy || !confirmed}
          onClick={() => void ocr.runOcr()}
        >
          Run OCR
        </button>
        <button
          type="button"
          className="tools-converter-btn"
          disabled={ocr.busy || !confirmed}
          onClick={() => void ocr.runAltText()}
        >
          Alt text
        </button>
        <button
          type="button"
          className="tools-converter-btn"
          disabled={ocr.busy || !ocr.result}
          onClick={() => ocr.downloadSidecar()}
        >
          Download sidecar
        </button>
      </div>
      {ocr.error && <p className="tools-converter-error" role="alert">{ocr.error}</p>}
      {ocr.result?.text && (
        <ConverterAiReviewCard
          title="OCR result"
          explanation={ocr.result.text.slice(0, 400)}
          warnings={ocr.result.warnings}
          confirmed
          applyLabel="Keep result"
          onApply={() => {}}
        />
      )}
      {ocr.result?.altText && (
        <p className="tools-converter-muted" aria-live="polite">{ocr.result.altText}</p>
      )}
    </section>
  );
}
