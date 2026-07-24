/**
 * SRT/VTT builders from normalized transcript cues.
 */

/**
 * @typedef {{ start: number, end: number, text: string }} TranscriptCue
 */

/**
 * @param {number} seconds
 * @param {'srt' | 'vtt'} format
 */
export function formatTimestamp(seconds, format = 'srt') {
  const s = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const sep = format === 'vtt' ? '.' : ',';
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}${sep}${pad(ms, 3)}`;
}

/**
 * @param {TranscriptCue[]} cues
 */
export function cuesToSrt(cues) {
  return (Array.isArray(cues) ? cues : [])
    .map((cue, i) => {
      const text = String(cue.text || '').trim();
      if (!text) return '';
      return [
        String(i + 1),
        `${formatTimestamp(cue.start, 'srt')} --> ${formatTimestamp(cue.end, 'srt')}`,
        text,
        '',
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {TranscriptCue[]} cues
 */
export function cuesToVtt(cues) {
  const body = (Array.isArray(cues) ? cues : [])
    .map((cue) => {
      const text = String(cue.text || '').trim();
      if (!text) return '';
      return `${formatTimestamp(cue.start, 'vtt')} --> ${formatTimestamp(cue.end, 'vtt')}\n${text}\n`;
    })
    .filter(Boolean)
    .join('\n');
  return `WEBVTT\n\n${body}`;
}

/**
 * Translate cue texts via a map function without mutating source.
 * @param {TranscriptCue[]} cues
 * @param {(text: string) => string} mapText
 */
export function mapCueTexts(cues, mapText) {
  return (Array.isArray(cues) ? cues : []).map((cue) => ({
    start: cue.start,
    end: cue.end,
    text: mapText(String(cue.text || '')),
  }));
}

/**
 * @param {unknown} raw
 * @returns {TranscriptCue[]}
 */
export function normalizeTranscriptCues(raw) {
  if (!Array.isArray(raw)) {
    if (typeof raw === 'string' && raw.trim()) {
      return [{ start: 0, end: 1, text: raw.trim().slice(0, 5000) }];
    }
    return [];
  }
  return raw.map((row, i) => {
    const r = row && typeof row === 'object' ? /** @type {Record<string, unknown>} */ (row) : {};
    const start = Number(r.start) || i;
    const end = Number(r.end) || start + 1;
    return {
      start,
      end: Math.max(end, start + 0.1),
      text: String(r.text || '').slice(0, 500),
    };
  }).filter((c) => c.text);
}
