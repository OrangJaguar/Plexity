import { describe, expect, it } from 'vitest';
import { createEmptyProject, createClip, createTrack, clipDurationMs, computeProjectDuration, withRecomputedDuration } from './video-project.js';
import {
  addClipFromMedia,
  addMediaToProject,
  buildExportVideoSegments,
  deleteClip,
  linkAvPair,
  moveClip,
  snapTime,
  splitClipAtPlayhead,
  trimClipEdge,
  unlinkClip,
} from './video-timeline.js';
import { planExport } from './video-export.js';
import { VIDEO_IMAGE_DEFAULT_MS } from './video-limits.js';

/** @returns {import('./video-project.js').MediaAsset} */
function fakeMedia(partial) {
  return {
    id: partial.id || 'm1',
    name: partial.name || 'clip.mp4',
    kind: partial.kind || 'video',
    mime: partial.mime || 'video/mp4',
    blob: new Blob(['x']),
    objectUrl: 'blob:test',
    durationMs: partial.durationMs ?? 10000,
    width: partial.width ?? 1280,
    height: partial.height ?? 720,
    fileBytes: 100,
  };
}

describe('video-project duration', () => {
  it('computes duration from farthest clip end', () => {
    let p = createEmptyProject();
    const track = p.tracks[0];
    track.clips.push(createClip({
      mediaId: 'm',
      trackId: track.id,
      timelineStartMs: 1000,
      sourceInMs: 0,
      sourceOutMs: 4000,
    }));
    expect(computeProjectDuration(p)).toBe(5000);
  });
});

describe('timeline split / trim / move / snap', () => {
  it('splits clip at playhead and unlinks right half until partner split', () => {
    let p = createEmptyProject();
    const media = fakeMedia({ id: 'vid' });
    p = addMediaToProject(p, media);
    p = addClipFromMedia(p, 'vid', { timelineStartMs: 0 });
    const vClip = p.tracks.find((t) => t.type === 'video').clips[0];
    expect(vClip.linkedClipId).toBeTruthy();
    p = splitClipAtPlayhead(p, vClip.id, 2500);
    const videoClips = p.tracks.find((t) => t.type === 'video').clips;
    expect(videoClips).toHaveLength(2);
    expect(clipDurationMs(videoClips[0])).toBe(2500);
    expect(videoClips[1].timelineStartMs).toBe(2500);
    expect(clipDurationMs(videoClips[1])).toBe(7500);
  });

  it('trims left and right edges', () => {
    let p = createEmptyProject();
    const media = fakeMedia({ id: 'vid', durationMs: 8000 });
    p = addMediaToProject(p, media);
    p = addClipFromMedia(p, 'vid');
    const id = p.selectedClipId;
    p = trimClipEdge(p, id, 'left', 1000);
    let clip = p.tracks.flatMap((t) => t.clips).find((c) => c.id === id);
    expect(clip.timelineStartMs).toBe(1000);
    expect(clip.sourceInMs).toBe(1000);
    p = trimClipEdge(p, id, 'right', 5000);
    clip = p.tracks.flatMap((t) => t.clips).find((c) => c.id === id);
    expect(clip.sourceOutMs).toBe(clip.sourceInMs + (5000 - clip.timelineStartMs));
  });

  it('moves clip and linked partner together', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    const v = p.tracks.find((t) => t.type === 'video').clips[0];
    const aId = v.linkedClipId;
    p = moveClip(p, v.id, 2000);
    expect(p.tracks.find((t) => t.type === 'video').clips[0].timelineStartMs).toBe(2000);
    expect(p.tracks.find((t) => t.type === 'audio').clips.find((c) => c.id === aId).timelineStartMs).toBe(2000);
  });

  it('snaps near clip edges and zero', () => {
    let p = createEmptyProject();
    const track = p.tracks[0];
    track.clips.push(createClip({
      mediaId: 'm',
      trackId: track.id,
      timelineStartMs: 1000,
      sourceInMs: 0,
      sourceOutMs: 2000,
    }));
    expect(snapTime(p, 40)).toBe(0);
    expect(snapTime(p, 1080)).toBe(1000);
    expect(snapTime(p, 2950)).toBe(3000);
  });

  it('places image stills with default duration', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'img', kind: 'image', durationMs: 0, name: 'a.png' }));
    p = addClipFromMedia(p, 'img');
    const clip = p.tracks.find((t) => t.type === 'video').clips[0];
    expect(clipDurationMs(clip)).toBe(VIDEO_IMAGE_DEFAULT_MS);
  });

  it('deletes linked pair together', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    const id = p.selectedClipId;
    p = deleteClip(p, id);
    expect(p.tracks.every((t) => t.clips.length === 0)).toBe(true);
  });
});

describe('A/V link helpers', () => {
  it('unlinks and re-links across track types', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    const v = p.tracks.find((t) => t.type === 'video').clips[0];
    const a = p.tracks.find((t) => t.type === 'audio').clips[0];
    p = unlinkClip(p, v.id);
    expect(p.tracks.find((t) => t.type === 'video').clips[0].linkedClipId).toBeNull();
    expect(p.tracks.find((t) => t.type === 'audio').clips[0].linkedClipId).toBeNull();
    p = linkAvPair(p, v.id, a.id);
    expect(p.tracks.find((t) => t.type === 'video').clips[0].linkedClipId).toBe(a.id);
    expect(p.tracks.find((t) => t.type === 'audio').clips[0].linkedClipId).toBe(v.id);
  });

  it('refuses linking same track types', () => {
    let p = createEmptyProject();
    const vt = p.tracks.find((t) => t.type === 'video');
    const a = createClip({ mediaId: 'm', trackId: vt.id, timelineStartMs: 0, sourceOutMs: 1000 });
    const b = createClip({ mediaId: 'm', trackId: vt.id, timelineStartMs: 1000, sourceOutMs: 2000 });
    vt.clips.push(a, b);
    const next = linkAvPair(p, a.id, b.id);
    expect(next.tracks.find((t) => t.type === 'video').clips[0].linkedClipId).toBeNull();
  });
});

describe('export segment planner', () => {
  it('builds ordered video segments without running FFmpeg', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid', durationMs: 5000 }));
    p = addClipFromMedia(p, 'vid', { timelineStartMs: 0 });
    p = withRecomputedDuration(p);
    const segs = buildExportVideoSegments(p);
    expect(segs).toHaveLength(1);
    expect(segs[0].durationMs).toBe(5000);
    expect(segs[0].startMs).toBe(0);
    const plan = planExport(p);
    expect(plan.videoCount).toBe(1);
    expect(plan.audioCount).toBe(1);
    expect(plan.totalDurationMs).toBe(5000);
  });

  it('includes multiple clips in timeline order', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'a', durationMs: 2000, name: 'a.mp4' }));
    p = addMediaToProject(p, fakeMedia({ id: 'b', durationMs: 3000, name: 'b.mp4' }));
    // Place without auto dual for second — use addClipFromMedia twice
    p = addClipFromMedia(p, 'a', { timelineStartMs: 0 });
    // Manually add second video-only style by placing b after
    p = addClipFromMedia(p, 'b', { timelineStartMs: 2000 });
    const segs = buildExportVideoSegments(p);
    expect(segs.length).toBeGreaterThanOrEqual(2);
    expect(segs[0].media.id).toBe('a');
    expect(segs[1].media.id).toBe('b');
  });
});

describe('createTrack', () => {
  it('creates typed tracks', () => {
    const t = createTrack({ type: 'audio', name: 'SFX' });
    expect(t.type).toBe('audio');
    expect(t.clips).toEqual([]);
  });
});
