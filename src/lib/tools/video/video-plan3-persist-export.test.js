import { describe, expect, it } from 'vitest';
import { serializeProjectForPersist } from './video-persist.js';
import { createEmptyProject, clipDurationMs } from './video-project.js';
import {
  addCaptionClip,
  addClipFromMedia,
  addMediaToProject,
  setClipSpeed,
  setClipFreeze,
  setClipReverse,
} from './video-timeline.js';
import { buildExportGraph, summarizeExportGraph } from './video-export-graph.js';
import { applyPresetToProject, getExportPreset } from './video-export-presets.js';
import { planExport } from './video-export.js';

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

describe('video persist serialize', () => {
  it('strips object URLs and keeps media stubs', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    const meta = serializeProjectForPersist(p);
    expect(meta.media[0].objectUrl).toBe('');
    expect(meta.media[0].id).toBe('vid');
    expect(meta.schemaVersion).toBeTruthy();
    expect(meta.id).toBeTruthy();
    expect(meta.duck).toBeTruthy();
  });
});

describe('video export graph plan 3', () => {
  it('includes speed filters and caption layers', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid', durationMs: 8000 }));
    p = addClipFromMedia(p, 'vid');
    const id = p.selectedClipId;
    p = setClipSpeed(p, id, 2);
    expect(clipDurationMs(p.tracks.flatMap((t) => t.clips).find((c) => c.id === id))).toBe(4000);
    p = addCaptionClip(p, 'Title', { timelineStartMs: 0, durationMs: 2000 });
    const graph = buildExportGraph(p);
    const base = graph.videoLayers.find((l) => l.role === 'base');
    expect(base?.speedVf?.length).toBeGreaterThan(0);
    expect(graph.videoLayers.some((l) => l.role === 'caption')).toBe(true);
    const summary = summarizeExportGraph(graph);
    expect(summary.baseCount).toBeGreaterThanOrEqual(1);
  });

  it('plans freeze and reverse fragments', () => {
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    const id = p.selectedClipId;
    p = setClipFreeze(p, id, true);
    let graph = buildExportGraph(p);
    expect(graph.videoLayers[0].speedVf.some((f) => f.startsWith('loop'))).toBe(true);
    p = setClipFreeze(p, id, false);
    p = setClipReverse(p, id, true);
    graph = buildExportGraph(p);
    expect(graph.videoLayers[0].speedVf).toContain('reverse');
  });

  it('applies export presets and audio-only plan', () => {
    const phone = getExportPreset('phone-9-16');
    expect(phone.width).toBe(1080);
    expect(phone.height).toBe(1920);
    let p = createEmptyProject();
    p = addMediaToProject(p, fakeMedia({ id: 'vid' }));
    p = addClipFromMedia(p, 'vid');
    p = applyPresetToProject(p, 'phone-9-16');
    expect(p.width).toBe(1080);
    expect(p.height).toBe(1920);

    p = addMediaToProject(p, fakeMedia({ id: 'aud', kind: 'audio', mime: 'audio/mpeg', name: 'a.mp3' }));
    p = addClipFromMedia(p, 'aud');
    const plan = planExport(p, { audioOnly: true });
    expect(plan.graph.audioOnly).toBe(true);
    expect(Array.isArray(plan.checklist)).toBe(true);
  });
});
