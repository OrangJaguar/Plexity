/**
 * Microphone permission helpers for Web Speech API voice input.
 */

export function isSecureSpeechContext() {
  return typeof window !== 'undefined'
    && (window.isSecureContext || window.location?.protocol === 'https:' || window.location?.hostname === 'localhost');
}

export async function queryMicrophonePermission() {
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const result = await navigator.permissions.query({ name: 'microphone' });
    return result.state;
  } catch {
    return 'unknown';
  }
}

/**
 * Prompt for mic access via getUserMedia. Must be called from a user click handler.
 * Returns true when audio input is available.
 */
export async function requestMicrophoneAccess() {
  if (!isSecureSpeechContext()) {
    return {
      ok: false,
      reason: 'insecure',
      message: 'Microphone access requires HTTPS or localhost. Open the app in your browser directly.',
    };
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: true,
      reason: 'no-api',
      message: null,
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true, reason: 'granted', message: null };
  } catch (err) {
    const name = err?.name ?? '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return {
        ok: false,
        reason: 'denied',
        message: 'Microphone blocked. Click the lock icon in your browser address bar, allow the microphone, then try again.',
      };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        ok: false,
        reason: 'no-device',
        message: 'No microphone found. Connect a mic or check system settings.',
      };
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        ok: false,
        reason: 'busy',
        message: 'Microphone is in use by another app. Close other apps using the mic and try again.',
      };
    }
    return {
      ok: false,
      reason: 'error',
      message: 'Could not access the microphone. Try Chrome or Edge on desktop.',
    };
  }
}

export function speechRecognitionErrorMessage(errorCode) {
  switch (errorCode) {
    case 'not-allowed':
      return 'Microphone permission denied. Allow the mic in your browser settings and tap Mic again.';
    case 'service-not-allowed':
      return 'Speech recognition is blocked for this page. Open Plexity in Chrome or Edge (not an embedded preview).';
    case 'network':
      return 'Voice input needs an internet connection in this browser.';
    case 'audio-capture':
      return 'Could not capture audio. Check that your microphone is connected and allowed.';
    case 'no-speech':
      return null;
    case 'aborted':
      return null;
    default:
      return errorCode ? `Voice input stopped (${errorCode}).` : 'Voice input stopped.';
  }
}
