import { cuesToSrt, formatTimestamp } from '@/lib/tools/converter/ai/subtitles.js';
import { VIDEO_IMAGE_DEFAULT_MS } from './video-limits.js';
import { defaultVideoTextStyle, normalizeVideoTextStyle } from './video-text.js';

/**
 * @typedef {{ startSec: number, endSec: number, text: string }} CaptionCue
 */

export const VIDEO_CAPTION_DEFAULT_MS = VIDEO_IMAGE_DEFAULT_MS;

/** Caption text style tuned for lower-third readability */
export function defaultCaptionStyle() {
  return normalizeVideoTextStyle({
    ...defaultVideoTextStyle(),
    fontSize: 36,
    fontWeight: 'bold',
    align: 'center',
    shadow: true,
  });
}

/**
 * Parse SRT text into cues (seconds).
 * @param {string} srt
 * @returns {CaptionCue[]}
 */
export function parseSrt(srt) {
  const text = String(srt || '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];
  const blocks = text.split(/\n\n+/);
  /** @type {CaptionCue[]} */
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    let idx = 0;
    if (/^\d+$/.test(lines[0])) idx = 1;
    const timeLine = lines[idx];
    const m = timeLine.match(
      /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/,
    );
    if (!m) continue;
    const toSec = (h, mi, s, ms) => (
      Number(h) * 3600 + Number(mi) * 60 + Number(s) + Number(String(ms).padEnd(3, '0').slice(0, 3)) / 1000
    );
    const startSec = toSec(m[1], m[2], m[3], m[4]);
    const endSec = toSec(m[5], m[6], m[7], m[8]);
    const body = lines.slice(idx + 1).join('\n').trim();
    if (!body) continue;
    cues.push({
      startSec,
      endSec: Math.max(endSec, startSec + 0.1),
      text: body.slice(0, 500),
    });
  }
  return cues;
}

/**
 * @param {CaptionCue[]} cues
 */
export function serializeSrt(cues) {
  return cuesToSrt(
    (cues || []).map((c) => ({
      start: c.startSec,
      end: c.endSec,
      text: c.text,
    })),
  );
}

/**
 * Project caption clips → CaptionCue[].
 * @param {import('./video-project.js').VideoProject} project
 * @returns {CaptionCue[]}
 */
export function projectToCaptionCues(project) {
  /** @type {CaptionCue[]} */
  const cues = [];
  for (const track of project.tracks) {
    if (track.type !== 'captions') continue;
    for (const clip of track.clips) {
      if (clip.kind !== 'caption') continue;
      const startSec = clip.timelineStartMs / 1000;
      const durMs = Math.max(1, clip.sourceOutMs - clip.sourceInMs);
      cues.push({
        startSec,
        endSec: startSec + durMs / 1000,
        text: String(clip.text || ''),
      });
    }
  }
  return cues.sort((a, b) => a.startSec - b.startSec);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 */
export function exportProjectSrt(project) {
  return serializeSrt(projectToCaptionCues(project));
}

export { formatTimestamp };
