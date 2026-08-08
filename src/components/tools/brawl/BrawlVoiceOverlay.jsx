import { useEffect, useRef, useState } from 'react';

/**
 * Push-to-talk overlay: mic + volume bars + editable transcript before send.
 * @param {{
 *   open: boolean,
 *   listening: boolean,
 *   transcript: string,
 *   onTranscriptChange: (text: string) => void,
 *   onSend: () => void,
 *   onCancel: () => void,
 *   holdHint?: string,
 * }} props
 */
export default function BrawlVoiceOverlay({
  open,
  listening,
  transcript,
  onTranscriptChange,
  onSend,
  onCancel,
  holdHint = 'Hold Space',
}) {
  const [levels, setLevels] = useState(() => Array.from({ length: 12 }, () => 0.08));
  const streamRef = useRef(/** @type {MediaStream | null} */ (null));
  const rafRef = useRef(0);
  const analyserRef = useRef(/** @type {AnalyserNode | null} */ (null));
  const audioCtxRef = useRef(/** @type {AudioContext | null} */ (null));

  useEffect(() => {
    if (!open || !listening) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      analyserRef.current = null;
      try { audioCtxRef.current?.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
      setLevels(Array.from({ length: 12 }, () => 0.08));
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        analyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (cancelled || !analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(data);
          const next = [];
          const step = Math.max(1, Math.floor(data.length / 12));
          for (let i = 0; i < 12; i += 1) {
            const v = data[i * step] || 0;
            next.push(Math.max(0.08, Math.min(1, v / 180)));
          }
          setLevels(next);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Volume meter is optional; STT may still work
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      try { audioCtxRef.current?.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    };
  }, [open, listening]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onSend]);

  if (!open) return null;

  return (
    <div className="tools-brawl-voice-overlay" role="dialog" aria-label="Voice draft">
      <div className="tools-brawl-voice-card">
        <div className="tools-brawl-voice-mic" data-listening={listening ? '1' : '0'}>
          <span className="tools-brawl-voice-mic-dot" aria-hidden />
          <strong>{listening ? 'Listening' : 'Edit & send'}</strong>
          <em>{listening ? holdHint : 'Enter to apply · Esc to dismiss'}</em>
        </div>
        <div className="tools-brawl-voice-wave" aria-hidden>
          {levels.map((lv, i) => (
            <span key={i} style={{ transform: `scaleY(${0.25 + lv * 0.75})` }} />
          ))}
        </div>
        <textarea
          className="tools-settings-input tools-brawl-voice-transcript"
          rows={3}
          value={transcript}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder='e.g. ban Shelly · we pick Piper · enemy picked Colt'
          autoFocus={!listening}
        />
        <div className="tools-brawl-settings-actions">
          <button type="button" className="btn btn-sm" onClick={onCancel}>Dismiss</button>
          <button type="button" className="btn btn-sm btn-primary" onClick={onSend} disabled={!transcript.trim()}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
