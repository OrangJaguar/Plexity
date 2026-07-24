import { useCallback, useState } from 'react';
import { converterAiOcrAltText, converterAiOcrRun } from '@/api/admin/converter-ai-api';
import { trackConverterEvent, TELEMETRY_EVENTS } from '@/lib/tools/converter/converter-telemetry.js';

/**
 * Admin OCR hook — results stay as text sidecars; no File/OPFS coercion.
 */
export function useAdminConverterAiOcr() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const runOcr = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await converterAiOcrRun({ confirmed: true });
      setResult(data);
      trackConverterEvent(TELEMETRY_EVENTS.AI_OCR_RUN, {
        outcome: 'success',
        aiAction: 'ocr.run',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR failed');
      trackConverterEvent(TELEMETRY_EVENTS.AI_FAIL, { outcome: 'fail', aiAction: 'ocr.run' });
    } finally {
      setBusy(false);
    }
  }, []);

  const runAltText = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await converterAiOcrAltText({ confirmed: true });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Alt text failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const downloadSidecar = useCallback(() => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-sidecar.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  return { result, busy, error, runOcr, runAltText, downloadSidecar };
}
