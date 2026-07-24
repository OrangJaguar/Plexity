/**
 * Voiceover recording via MediaRecorder (browser mic).
 */

/**
 * @returns {Promise<MediaStream>}
 */
export async function requestVoStream() {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw Object.assign(new Error('Microphone recording is not supported in this browser.'), { code: 'UNSUPPORTED' });
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (err) {
    const name = err && /** @type {DOMException} */ (err).name;
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      throw Object.assign(new Error('Microphone permission denied.'), { code: 'PERMISSION' });
    }
    throw Object.assign(new Error(err instanceof Error ? err.message : 'Could not open microphone.'), { code: 'MIC' });
  }
}

/**
 * @param {MediaStream} stream
 * @returns {{ recorder: MediaRecorder, chunks: Blob[], stop: () => Promise<Blob>, cancel: () => void }}
 */
export function startVoRecording(stream) {
  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : '';
  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  /** @type {Blob[]} */
  const chunks = [];
  recorder.ondataavailable = (e) => {
    if (e.data?.size) chunks.push(e.data);
  };
  recorder.start(200);

  const stopTracks = () => {
    for (const t of stream.getTracks()) t.stop();
  };

  return {
    recorder,
    chunks,
    stop() {
      return new Promise((resolve, reject) => {
        recorder.onstop = () => {
          stopTracks();
          const type = recorder.mimeType || 'audio/webm';
          resolve(new Blob(chunks, { type }));
        };
        recorder.onerror = () => {
          stopTracks();
          reject(new Error('Recording failed.'));
        };
        if (recorder.state !== 'inactive') recorder.stop();
        else {
          stopTracks();
          resolve(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        }
      });
    },
    cancel() {
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // ignore
      }
      stopTracks();
      chunks.length = 0;
    },
  };
}

/**
 * Simple peak level 0–1 from AnalyserNode.
 * @param {MediaStream} stream
 * @returns {{ getLevel: () => number, dispose: () => void }}
 */
export function createVoMeter(stream) {
  const Ctx = window.AudioContext || /** @type {typeof AudioContext} */ (window.webkitAudioContext);
  if (!Ctx) {
    return { getLevel: () => 0, dispose: () => {} };
  }
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  return {
    getLevel() {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i += 1) {
        peak = Math.max(peak, Math.abs(data[i] - 128));
      }
      return Math.min(1, peak / 128);
    },
    dispose() {
      try {
        src.disconnect();
        analyser.disconnect();
        void ctx.close();
      } catch {
        // ignore
      }
    },
  };
}
