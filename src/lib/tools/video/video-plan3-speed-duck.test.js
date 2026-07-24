import { describe, expect, it } from 'vitest';
import {
  normalizeSpeed,
  timelineDurationMs,
  sourceTimeSecAtPlayhead,
  atempoChain,
  ffmpegSpeedFilters,
} from './video-speed.js';
import {
  buildDuckEnvelopes,
  duckGainAtPlayhead,
  isVoActiveAtPlayhead,
  normalizeDuckSettings,
  dbToLinear,
} from './video-duck.js';
import { createEmptyProject, createClip, createTrack, withRecomputedDuration } from './video-project.js';

describe('video speed', () => {
  it('normalizes and clamps speed', () => {
    expect(normalizeSpeed(2)).toBe(2);
    expect(normalizeSpeed(0.1)).toBe(0.25);
    expect(normalizeSpeed(99)).toBe(4);
    expect(normalizeSpeed('x')).toBe(1);
  });

  it('shortens timeline duration when faster', () => {
    const clip = { sourceInMs: 0, sourceOutMs: 4000, speed: 2 };
    expect(timelineDurationMs(clip)).toBe(2000);
    expect(timelineDurationMs({ ...clip, speed: 0.5 })).toBe(8000);
  });

  it('maps playhead to source time with reverse and freeze', () => {
    const clip = {
      timelineStartMs: 1000,
      sourceInMs: 0,
      sourceOutMs: 4000,
      speed: 1,
    };
    expect(sourceTimeSecAtPlayhead(clip, 3000)).toBeCloseTo(2, 3);
    expect(sourceTimeSecAtPlayhead({ ...clip, reverse: true }, 2000)).toBeCloseTo(3, 3);
    expect(sourceTimeSecAtPlayhead({ ...clip, freeze: true }, 3500)).toBe(0);
  });

  it('builds atempo chain and ffmpeg fragments', () => {
    expect(atempoChain(4).length).toBeGreaterThanOrEqual(2);
    const slow = ffmpegSpeedFilters({ sourceInMs: 0, sourceOutMs: 2000, speed: 0.5 });
    expect(slow.vf.some((f) => f.includes('setpts'))).toBe(true);
    expect(slow.af.some((f) => f.startsWith('atempo'))).toBe(true);
    const rev = ffmpegSpeedFilters({ sourceInMs: 0, sourceOutMs: 1000, reverse: true, speed: 1 });
    expect(rev.vf).toContain('reverse');
    const fr = ffmpegSpeedFilters({ sourceInMs: 0, sourceOutMs: 1500, freeze: true });
    expect(fr.vf.some((f) => f.startsWith('loop'))).toBe(true);
  });
});

describe('video duck', () => {
  it('converts db and applies gain when VO active', () => {
    expect(dbToLinear(6)).toBeCloseTo(0.501, 2);
    const duck = normalizeDuckSettings({ enabled: true, amountDb: 12 });
    expect(duckGainAtPlayhead(duck, false)).toBe(1);
    expect(duckGainAtPlayhead(duck, true)).toBeCloseTo(dbToLinear(12), 3);
  });

  it('builds overlap envelopes for music under VO', () => {
    let p = createEmptyProject();
    p = {
      ...p,
      duck: normalizeDuckSettings({ enabled: true, amountDb: 12 }),
      media: [
        {
          id: 'vo',
          name: 'vo.webm',
          kind: 'audio',
          mime: 'audio/webm',
          blob: new Blob(['a']),
          objectUrl: 'blob:vo',
          durationMs: 2000,
          width: 0,
          height: 0,
          fileBytes: 1,
          fromVo: true,
        },
        {
          id: 'music',
          name: 'music.mp3',
          kind: 'audio',
          mime: 'audio/mpeg',
          blob: new Blob(['b']),
          objectUrl: 'blob:m',
          durationMs: 5000,
          width: 0,
          height: 0,
          fileBytes: 1,
        },
      ],
      tracks: [
        createTrack({
          id: 'a1',
          type: 'audio',
          name: 'Audio',
          clips: [
            createClip({
              trackId: 'a1',
              mediaId: 'vo',
              timelineStartMs: 1000,
              sourceInMs: 0,
              sourceOutMs: 2000,
              audioRole: 'vo',
            }),
            createClip({
              trackId: 'a1',
              mediaId: 'music',
              timelineStartMs: 0,
              sourceInMs: 0,
              sourceOutMs: 5000,
              audioRole: 'music',
            }),
          ],
        }),
      ],
    };
    p = withRecomputedDuration(p);
    expect(isVoActiveAtPlayhead(p, 1500)).toBe(true);
    const envs = buildDuckEnvelopes(p);
    expect(envs.length).toBeGreaterThanOrEqual(1);
    expect(envs[0].gain).toBeCloseTo(dbToLinear(12), 3);
    expect(envs[0].timelineStartMs).toBe(1000);
  });
});
