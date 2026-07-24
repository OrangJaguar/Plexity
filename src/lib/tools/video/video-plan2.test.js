import { describe, expect, it } from 'vitest';
import {
  createEmptyProject,
  createClip,
  clipDurationMs,
  withRecomputedDuration,
} from './video-project.js';
import {
  addClipFromMedia,
  addMediaToProject,
  addMarker,
  addTextClip,
  addStickerClip,
  detachAudioFromVideo,
  pasteStyle,
  replaceClipMedia,
  rippleDeleteClip,
  setClipFilter,
  setClipTransform,
  setClipTransition,
  snapTime,
} from './video-timeline.js';
import { filterFromPreset, cssFilterFromParams, ffmpegEqFromParams } from './video-filters.js';
import { buildExportGraph, summarizeExportGraph } from './video-export-graph.js';
import { VIDEO_IMAGE_DEFAULT_MS } from './video-limits.js';

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

describe('Plan 2 text / transform / filter', () => {
  it('places text clip on text track with default duration', () => {
    let p = createEmptyProject();
    p = addTextClip(p, 'Hello', { timelineStartMs: 500 });
    const track = p.tracks.find((t) => t.type === 'text');
    expect(track).toBeTruthy();
    expect(track.clips).toHaveLength(1);
    expect(track.clips[0].text).toBe('Hello');
    expect(clipDurationMs(track.clips[0])).toBe(VIDEO_IMAGE_DEFAULT_MS);
    expect(track.clips[0].transform.scale).toBe(1);
  });

  it('sets transform and filter on media clip', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    const id = p.selectedClipId;
    p = setClipTransform(p, id, { x: 40, y: 80, scale: 1.5, rotation: 15 });
    const clip = p.tracks.flatMap((t) => t.clips).find((c) => c.id === id);
    expect(clip.transform.x).toBe(40);
    expect(clip.transform.rotation).toBe(15);
    p = setClipFilter(p, id, filterFromPreset('vivid'));
    const f = p.tracks.flatMap((t) => t.clips).find((c) => c.id === id).filter;
    expect(f.presetId).toBe('vivid');
    expect(cssFilterFromParams(f)).toContain('brightness');
    expect(ffmpegEqFromParams(f)).toContain('eq=');
  });

  it('stores outgoing transition', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    const id = p.selectedClipId;
    p = setClipTransition(p, id, { type: 'dissolve', durationMs: 700 });
    const clip = p.tracks.flatMap((t) => t.clips).find((c) => c.id === id);
    expect(clip.transition.type).toBe('dissolve');
    expect(clip.transition.durationMs).toBe(700);
  });
});

describe('Plan 2 ripple / detach / replace / markers / pasteStyle', () => {
  it('ripple deletes and closes gap on track', () => {
    let p = createEmptyProject();
    const track = p.tracks[0];
    const a = createClip({
      kind: 'media',
      mediaId: 'm',
      trackId: track.id,
      timelineStartMs: 0,
      sourceInMs: 0,
      sourceOutMs: 2000,
    });
    const b = createClip({
      kind: 'media',
      mediaId: 'm',
      trackId: track.id,
      timelineStartMs: 2000,
      sourceInMs: 0,
      sourceOutMs: 2000,
    });
    track.clips.push(a, b);
    p = withRecomputedDuration(p);
    p = rippleDeleteClip(p, a.id);
    const remaining = p.tracks[0].clips;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(b.id);
    expect(remaining[0].timelineStartMs).toBe(0);
  });

  it('detaches A/V and mutes video source audio', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    const v = p.tracks.find((t) => t.type === 'video').clips[0];
    p = detachAudioFromVideo(p, v.id);
    const v2 = p.tracks.find((t) => t.type === 'video').clips[0];
    const a2 = p.tracks.find((t) => t.type === 'audio').clips[0];
    expect(v2.linkedClipId).toBeNull();
    expect(a2.linkedClipId).toBeNull();
    expect(v2.muteSourceAudio).toBe(true);
  });

  it('replaces media keeping clip id', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'a', durationMs: 5000 }));
    p = addMediaToProject(p, fakeMedia({ id: 'b', durationMs: 8000, name: 'b.mp4' }));
    p = addClipFromMedia(p, 'a');
    const id = p.selectedClipId;
    p = replaceClipMedia(p, id, 'b');
    const clip = p.tracks.flatMap((t) => t.clips).find((c) => c.id === id);
    expect(clip.mediaId).toBe('b');
  });

  it('snaps to markers', () => {
    let p = createEmptyProject();
    p = addMarker(p, 2500, 'beat');
    expect(snapTime(p, 2480)).toBe(2500);
  });

  it('pastes filter style between clips', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'a' }));
    p = addMediaToProject(p, fakeMedia({ id: 'b', name: 'b.mp4' }));
    p = addClipFromMedia(p, 'a', { timelineStartMs: 0 });
    const srcId = p.selectedClipId;
    p = setClipFilter(p, srcId, filterFromPreset('mono'));
    p = addClipFromMedia(p, 'b', { timelineStartMs: 10000 });
    // second add creates another linked pair — pick last video clip
    const videoClips = p.tracks.find((t) => t.type === 'video').clips;
    const dstId = videoClips[videoClips.length - 1].id;
    p = pasteStyle(p, srcId, dstId);
    const dst = videoClips.find((c) => c.id === dstId);
    // re-find after paste
    const after = p.tracks.find((t) => t.type === 'video').clips.find((c) => c.id === dstId);
    expect(after.filter.presetId).toBe('mono');
    void dst;
  });
});

describe('export graph planner', () => {
  it('includes overlays, audio delays, and transitions', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid', durationMs: 4000 }));
    p = addClipFromMedia(p, 'vid', { timelineStartMs: 0 });
    const vId = p.tracks.find((t) => t.type === 'video').clips[0].id;
    p = setClipTransition(p, vId, { type: 'wipe', durationMs: 400 });
    p = setClipFilter(p, vId, filterFromPreset('cool'));
    p = addTextClip(p, 'Title', { timelineStartMs: 200 });
    p = withRecomputedDuration(p);
    const graph = buildExportGraph(p);
    const summary = summarizeExportGraph(graph);
    expect(summary.baseCount).toBe(1);
    expect(summary.overlayCount).toBeGreaterThanOrEqual(1);
    expect(summary.audioCount).toBeGreaterThanOrEqual(1);
    expect(graph.audioLayers[0].delayMs).toBe(0);
    expect(graph.videoLayers.find((l) => l.role === 'base')?.filterEq).toContain('eq=');
    // transition only when there are 2+ base clips
    expect(Array.isArray(graph.transitions)).toBe(true);
  });

  it('plans transition between adjacent base clips', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'a', durationMs: 2000, name: 'a.mp4' }));
    p = addMediaToProject(p, fakeMedia({ id: 'b', durationMs: 2000, name: 'b.mp4' }));
    p = addClipFromMedia(p, 'a', { timelineStartMs: 0 });
    p = addClipFromMedia(p, 'b', { timelineStartMs: 2000 });
    const first = p.tracks.find((t) => t.type === 'video').clips[0];
    p = setClipTransition(p, first.id, { type: 'dissolve', durationMs: 500 });
    const graph = buildExportGraph(p);
    expect(graph.transitions.length).toBeGreaterThanOrEqual(1);
    expect(graph.transitions[0].xfade).toBe('fade');
  });
});

describe('sticker clip place (media already present)', () => {
  it('places sticker on sticker track', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'st', kind: 'image', name: 'star.png', durationMs: 0 }));
    p = addStickerClip(p, 'st', { graphicId: 'star', timelineStartMs: 0 });
    const track = p.tracks.find((t) => t.type === 'sticker');
    expect(track.clips[0].kind).toBe('sticker');
    expect(track.clips[0].graphicId).toBe('star');
  });
});
