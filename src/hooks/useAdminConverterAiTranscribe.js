import { useCallback, useState } from 'react';
import {
  converterAiSubtitleGenerate,
  converterAiTranscribeRun,
  converterAiTranscribeTranslate,
} from '@/api/admin/converter-ai-api';
import { trackConverterEvent, TELEMETRY_EVENTS } from '@/lib/tools/converter/converter-telemetry.js';

/**
 * Admin STT hook — cues/subtitles only; no local File coercion.
 */
export function useAdminConverterAiTranscribe() {
  const [text, setText] = useState('');
  const [cues, setCues] = useState(/** @type {Array<{ start: number, end: number, text: string }>} */ ([]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(/** @type {string | null} */ (null));

  const runTranscribe = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await converterAiTranscribeRun({ confirmed: true });
      setText(String(data.text || ''));
      setCues(Array.isArray(data.cues) ? data.cues : []);
      trackConverterEvent(TELEMETRY_EVENTS.AI_TRANSCRIBE_RUN, {
        outcome: 'success',
        aiAction: 'transcribe.run',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcribe failed');
      trackConverterEvent(TELEMETRY_EVENTS.AI_FAIL, { outcome: 'fail', aiAction: 'transcribe.run' });
    } finally {
      setBusy(false);
    }
  }, []);

  const translate = useCallback(async (language = 'en') => {
    setBusy(true);
    setError(null);
    try {
      const data = await converterAiTranscribeTranslate({
        confirmed: true,
        language,
        cues,
      });
      setCues(Array.isArray(data.cues) ? data.cues : []);
      setText((Array.isArray(data.cues) ? data.cues : []).map((c) => c.text).join(' '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translate failed');
    } finally {
      setBusy(false);
    }
  }, [cues]);

  const downloadSubtitles = useCallback(async (format = 'vtt') => {
    setBusy(true);
    setError(null);
    try {
      const data = await converterAiSubtitleGenerate({
        confirmed: true,
        format,
        cues,
      });
      const blob = new Blob([String(data.content || '')], {
        type: format === 'srt' ? 'application/x-subrip' : 'text/vtt',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'srt' ? 'transcript.srt' : 'transcript.vtt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subtitle download failed');
    } finally {
      setBusy(false);
    }
  }, [cues]);

  return { text, cues, busy, error, runTranscribe, translate, downloadSubtitles };
}
