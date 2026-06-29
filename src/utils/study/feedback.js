export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const AudioContext = typeof window !== 'undefined'
  ? (window.AudioContext || window.webkitAudioContext)
  : null;
let audioCtx = null;

let feedbackPrefs = { haptics: true, audio: true };

export function setStudyFeedbackPrefs(prefs) {
  feedbackPrefs = {
    haptics: prefs?.haptics !== false,
    audio: prefs?.audio !== false,
  };
}

export function getStudyFeedbackPrefs() {
  return feedbackPrefs;
}

export function initStudyAudio() {
  if (!AudioContext) return;
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

export function playStudySound(type) {
  if (!feedbackPrefs.audio) return;
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  if (type === 'correct') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.setValueAtTime(800, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'wrong') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'flip') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

export function triggerAnswerFeedback(correct, { enabled = true } = {}) {
  if (!enabled) return null;
  initStudyAudio();
  playStudySound(correct ? 'correct' : 'wrong');
  triggerStudyHaptic(correct ? 'correct' : 'wrong');
  return correct ? 'correct' : 'wrong';
}

export function triggerStudyHaptic(type) {
  if (!feedbackPrefs.haptics) return;
  if (!navigator.vibrate) return;
  if (type === 'correct') navigator.vibrate([30, 50, 30]);
  else if (type === 'wrong') navigator.vibrate([150]);
  else if (type === 'flip') navigator.vibrate(20);
}

export function formatStudyTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function fuzzyMatchAnswer(given, expected) {
  const a = String(given).trim().toLowerCase();
  const b = String(expected).trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}
