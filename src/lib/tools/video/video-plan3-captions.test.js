import { describe, expect, it } from 'vitest';
import {
  parseSrt,
  serializeSrt,
  exportProjectSrt,
  projectToCaptionCues,
  VIDEO_CAPTION_DEFAULT_MS,
} from './video-captions.js';
import { createEmptyProject, clipDurationMs } from './video-project.js';
import { addCaptionClip, importSrtToProject, splitClipAtPlayhead } from './video-timeline.js';

const SAMPLE_SRT = `1
00:00:01,000 --> 00:00:03,500
Hello class

2
00:00:04,000 --> 00:00:06,000
Second line
`;

describe('video captions SRT', () => {
  it('round-trips parse and serialize', () => {
    const cues = parseSrt(SAMPLE_SRT);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('Hello class');
    expect(cues[0].startSec).toBeCloseTo(1, 3);
    expect(cues[0].endSec).toBeCloseTo(3.5, 3);
    const again = parseSrt(serializeSrt(cues));
    expect(again).toHaveLength(2);
    expect(again[1].text).toBe('Second line');
  });

  it('places caption at playhead with default duration', () => {
    let p = createEmptyProject();
    p = { ...p, playheadMs: 1200 };
    p = addCaptionClip(p, 'Hi');
    const track = p.tracks.find((t) => t.type === 'captions');
    expect(track).toBeTruthy();
    expect(track.clips).toHaveLength(1);
    expect(track.clips[0].kind).toBe('caption');
    expect(track.clips[0].timelineStartMs).toBe(1200);
    expect(clipDurationMs(track.clips[0])).toBe(VIDEO_CAPTION_DEFAULT_MS);
  });

  it('imports SRT onto captions track and exports', () => {
    let p = createEmptyProject();
    p = importSrtToProject(p, SAMPLE_SRT);
    const cues = projectToCaptionCues(p);
    expect(cues).toHaveLength(2);
    const srt = exportProjectSrt(p);
    expect(srt).toContain('Hello class');
    expect(parseSrt(srt)).toHaveLength(2);
  });

  it('splits caption cue at playhead', () => {
    let p = createEmptyProject();
    p = addCaptionClip(p, 'Long cue', { timelineStartMs: 0, durationMs: 4000 });
    const id = p.selectedClipId;
    p = { ...p, playheadMs: 1500 };
    p = splitClipAtPlayhead(p, id, 1500);
    const track = p.tracks.find((t) => t.type === 'captions');
    expect(track.clips.length).toBeGreaterThanOrEqual(2);
    const total = track.clips.reduce((sum, c) => sum + clipDurationMs(c), 0);
    expect(total).toBe(4000);
  });
});
