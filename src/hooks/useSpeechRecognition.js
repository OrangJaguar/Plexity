import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  isSecureSpeechContext,
  requestMicrophoneAccess,
  speechRecognitionErrorMessage,
} from '@/utils/speech/microphone';

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined'
    && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function getRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

/**
 * Browser speech-to-text via Web Speech API.
 * Recognition starts synchronously on click to preserve the user-gesture;
 * getUserMedia runs only as a fallback when the browser blocks speech.
 */
export function useSpeechRecognition({ onTranscript, lang }) {
  const [listening, setListening] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const recognitionRef = useRef(null);
  const sessionIdRef = useRef(0);
  const wantListeningRef = useRef(false);
  const baseTextRef = useRef('');
  const lastTranscriptRef = useRef('');

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    sessionIdRef.current += 1;
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    setListening(false);
    setRequesting(false);
  }, []);

  const beginRecognition = useCallback((baseText = '', sessionId) => {
    const SpeechRecognition = getRecognitionCtor();
    if (!SpeechRecognition) return false;

    baseTextRef.current = baseText;
    lastTranscriptRef.current = baseText.trim();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang || navigator.language || 'en-US';

    recognition.onresult = (event) => {
      if (sessionIdRef.current !== sessionId) return;
      let sessionText = '';
      for (let i = 0; i < event.results.length; i += 1) {
        sessionText += event.results[i][0].transcript;
      }
      const base = baseTextRef.current;
      const next = base.trim()
        ? `${base} ${sessionText}`.trim()
        : sessionText.trim();
      lastTranscriptRef.current = next;
      onTranscript?.(next);
    };

    recognition.onerror = (event) => {
      if (sessionIdRef.current !== sessionId) return;
      if (event.error === 'aborted' || event.error === 'no-speech') return;

      wantListeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;

      const message = speechRecognitionErrorMessage(event.error);
      if (message) toast.error(message);
    };

    recognition.onend = () => {
      if (sessionIdRef.current !== sessionId) {
        setListening(false);
        return;
      }
      if (!wantListeningRef.current) {
        setListening(false);
        return;
      }
      baseTextRef.current = lastTranscriptRef.current;
      try {
        recognition.start();
      } catch {
        wantListeningRef.current = false;
        setListening(false);
        recognitionRef.current = null;
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      toast.message('Listening… speak now', { duration: 2000 });
      return true;
    } catch {
      wantListeningRef.current = false;
      setListening(false);
      return false;
    }
  }, [lang, onTranscript]);

  const requestMicThenStart = useCallback((baseText, sessionId) => {
    setRequesting(true);
    requestMicrophoneAccess()
      .then((result) => {
        setRequesting(false);
        if (sessionIdRef.current !== sessionId || !wantListeningRef.current) return;

        if (!result.ok) {
          wantListeningRef.current = false;
          toast.error(result.message);
          return;
        }

        if (!beginRecognition(baseText, sessionId)) {
          wantListeningRef.current = false;
          toast.error('Could not start voice input. Tap Mic again after allowing access.');
        }
      })
      .catch(() => {
        setRequesting(false);
        wantListeningRef.current = false;
        toast.error('Could not access the microphone.');
      });
  }, [beginRecognition]);

  const start = useCallback((baseText = '') => {
    if (!isSecureSpeechContext()) {
      toast.error('Microphone requires HTTPS or localhost. Open Plexity in Chrome or Edge.');
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge on desktop.');
      return;
    }

    stop();
    wantListeningRef.current = true;
    const sessionId = ++sessionIdRef.current;

    // Start immediately while the click user-gesture is still active.
    if (beginRecognition(baseText, sessionId)) return;

    // Fallback: explicit browser mic prompt, then retry recognition.
    requestMicThenStart(baseText, sessionId);
  }, [beginRecognition, requestMicThenStart, stop]);

  const toggle = useCallback((baseText = '') => {
    if (listening || requesting) {
      stop();
      return;
    }
    start(baseText);
  }, [listening, requesting, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return {
    listening,
    requesting,
    toggle,
    start,
    stop,
    supported: isSpeechRecognitionSupported(),
  };
}
