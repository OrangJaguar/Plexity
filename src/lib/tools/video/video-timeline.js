import {
  clipDurationMs,
  clipEndMs,
  createClip,
  createTrack,
  defaultTransform,
  findClip,
  normalizeTransform,
  withRecomputedDuration,
} from './video-project.js';
import { VIDEO_IMAGE_DEFAULT_MS } from './video-limits.js';
import { normalizeVideoFilter } from './video-filters.js';
import { normalizeTransition } from './video-transitions.js';
import { defaultVideoTextStyle, normalizeVideoTextStyle, measureVideoTextBox } from './video-text.js';
import { VIDEO_STICKER_DEFAULT_MS, VIDEO_STICKER_DEFAULT_SIZE } from './video-stickers.js';
import { defaultCaptionStyle, parseSrt, VIDEO_CAPTION_DEFAULT_MS } from './video-captions.js';
import { normalizeSpeed } from './video-speed.js';

const SNAP_THRESHOLD_MS = 120;

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {import('./video-project.js').MediaAsset} asset
 * @returns {import('./video-project.js').VideoProject}
 */
export function addMediaToProject(project, asset) {
  return {
    ...project,
    media: [...project.media, asset],
  };
}

/**
 * Place media on timeline. Video → linked A/V clips. Audio → audio track. Image → video track.
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} mediaId
 * @param {{ timelineStartMs?: number, trackId?: string }} [opts]
 */
export function addClipFromMedia(project, mediaId, opts = {}) {
  const asset = project.media.find((m) => m.id === mediaId);
  if (!asset) return project;

  const start = Math.max(0, opts.timelineStartMs ?? project.durationMs ?? 0);
  let next = project;

  if (asset.kind === 'video') {
    let videoTrack = next.tracks.find((t) => t.type === 'video' && !t.locked);
    let audioTrack = next.tracks.find((t) => t.type === 'audio' && !t.locked);
    if (!videoTrack) {
      videoTrack = createTrack({ type: 'video', name: `Video ${next.tracks.filter((t) => t.type === 'video').length + 1}` });
      next = { ...next, tracks: [...next.tracks, videoTrack] };
    }
    if (!audioTrack) {
      audioTrack = createTrack({ type: 'audio', name: `Audio ${next.tracks.filter((t) => t.type === 'audio').length + 1}` });
      next = { ...next, tracks: [...next.tracks, audioTrack] };
    }
    const dur = Math.max(1, asset.durationMs || 1000);
    const vId = crypto.randomUUID();
    const aId = crypto.randomUUID();
    const vClip = createClip({
      id: vId,
      kind: 'media',
      mediaId,
      trackId: videoTrack.id,
      timelineStartMs: start,
      sourceInMs: 0,
      sourceOutMs: dur,
      linkedClipId: aId,
    });
    const aClip = createClip({
      id: aId,
      kind: 'media',
      mediaId,
      trackId: audioTrack.id,
      timelineStartMs: start,
      sourceInMs: 0,
      sourceOutMs: dur,
      linkedClipId: vId,
    });
    next = patchTrackClips(next, videoTrack.id, (clips) => [...clips, vClip]);
    next = patchTrackClips(next, audioTrack.id, (clips) => [...clips, aClip]);
    next = { ...next, selectedClipId: vId };
    return withRecomputedDuration(next);
  }

  if (asset.kind === 'audio') {
    let audioTrack = opts.trackId
      ? next.tracks.find((t) => t.id === opts.trackId)
      : next.tracks.find((t) => t.type === 'audio' && !t.locked);
    if (!audioTrack || audioTrack.type !== 'audio') {
      audioTrack = createTrack({ type: 'audio', name: `Audio ${next.tracks.filter((t) => t.type === 'audio').length + 1}` });
      next = { ...next, tracks: [...next.tracks, audioTrack] };
    }
    const dur = Math.max(1, asset.durationMs || 1000);
    const clip = createClip({
      kind: 'media',
      mediaId,
      trackId: audioTrack.id,
      timelineStartMs: start,
      sourceInMs: 0,
      sourceOutMs: dur,
      audioRole: asset.fromVo ? 'vo' : 'music',
    });
    next = patchTrackClips(next, audioTrack.id, (clips) => [...clips, clip]);
    next = { ...next, selectedClipId: clip.id };
    return withRecomputedDuration(next);
  }

  // image still
  let videoTrack = opts.trackId
    ? next.tracks.find((t) => t.id === opts.trackId)
    : next.tracks.find((t) => t.type === 'video' && !t.locked);
  if (!videoTrack || videoTrack.type !== 'video') {
    videoTrack = createTrack({ type: 'video', name: `Video ${next.tracks.filter((t) => t.type === 'video').length + 1}` });
    next = { ...next, tracks: [...next.tracks, videoTrack] };
  }
  const clip = createClip({
    kind: 'media',
    mediaId,
    trackId: videoTrack.id,
    timelineStartMs: start,
    sourceInMs: 0,
    sourceOutMs: VIDEO_IMAGE_DEFAULT_MS,
  });
  next = patchTrackClips(next, videoTrack.id, (clips) => [...clips, clip]);
  next = { ...next, selectedClipId: clip.id };
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {'video'|'audio'|'overlay'|'text'|'sticker'} type
 */
function ensureTrack(project, type) {
  let track = project.tracks.find((t) => t.type === type && !t.locked);
  if (track) return { project, track };
  const count = project.tracks.filter((t) => t.type === type).length + 1;
  const labels = {
    video: 'Video', audio: 'Audio', overlay: 'Overlay', text: 'Text', sticker: 'Sticker', captions: 'Captions',
  };
  track = createTrack({ type, name: `${labels[type] || type} ${count}` });
  return { project: { ...project, tracks: [...project.tracks, track] }, track };
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} text
 * @param {{ timelineStartMs?: number, style?: object }} [opts]
 */
export function addTextClip(project, text = 'Text', opts = {}) {
  const start = Math.max(0, opts.timelineStartMs ?? project.playheadMs ?? 0);
  const { project: withTrack, track } = ensureTrack(project, 'text');
  const style = normalizeVideoTextStyle(opts.style || defaultVideoTextStyle());
  const box = measureVideoTextBox(style, text);
  const clip = createClip({
    kind: 'text',
    mediaId: null,
    trackId: track.id,
    timelineStartMs: start,
    sourceInMs: 0,
    sourceOutMs: VIDEO_IMAGE_DEFAULT_MS,
    text: String(text || 'Text'),
    style,
    transform: defaultTransform(withTrack.width, withTrack.height, box.width, box.height),
  });
  let next = patchTrackClips(withTrack, track.id, (clips) => [...clips, clip]);
  next = { ...next, selectedClipId: clip.id };
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} mediaId  rasterized sticker or image media
 * @param {{ timelineStartMs?: number, graphicId?: string }} [opts]
 */
export function addStickerClip(project, mediaId, opts = {}) {
  const asset = project.media.find((m) => m.id === mediaId);
  if (!asset) return project;
  const start = Math.max(0, opts.timelineStartMs ?? project.playheadMs ?? 0);
  const { project: withTrack, track } = ensureTrack(project, 'sticker');
  const size = VIDEO_STICKER_DEFAULT_SIZE;
  const clip = createClip({
    kind: 'sticker',
    mediaId,
    trackId: track.id,
    timelineStartMs: start,
    sourceInMs: 0,
    sourceOutMs: VIDEO_STICKER_DEFAULT_MS,
    graphicId: opts.graphicId ?? null,
    transform: defaultTransform(withTrack.width, withTrack.height, size, size),
  });
  let next = patchTrackClips(withTrack, track.id, (clips) => [...clips, clip]);
  next = { ...next, selectedClipId: clip.id };
  return withRecomputedDuration(next);
}

/**
 * Place image as PiP/overlay (not full-frame video track still).
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} mediaId
 * @param {{ timelineStartMs?: number }} [opts]
 */
export function addOverlayImageClip(project, mediaId, opts = {}) {
  const asset = project.media.find((m) => m.id === mediaId);
  if (!asset) return project;
  const start = Math.max(0, opts.timelineStartMs ?? project.playheadMs ?? 0);
  const { project: withTrack, track } = ensureTrack(project, 'overlay');
  const boxW = Math.min(480, asset.width || 320);
  const boxH = Math.min(270, asset.height || 180);
  const clip = createClip({
    kind: 'media',
    mediaId,
    trackId: track.id,
    timelineStartMs: start,
    sourceInMs: 0,
    sourceOutMs: Math.max(1, asset.durationMs || VIDEO_IMAGE_DEFAULT_MS),
    transform: defaultTransform(withTrack.width, withTrack.height, boxW, boxH),
  });
  let next = patchTrackClips(withTrack, track.id, (clips) => [...clips, clip]);
  next = { ...next, selectedClipId: clip.id };
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {Partial<import('./video-project.js').ClipTransform>} transform
 */
export function setClipTransform(project, clipId, transform) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const nextT = normalizeTransform({ ...found.clip.transform, ...transform });
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, transform: nextT } : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {number} opacity
 */
export function setClipOpacity(project, clipId, opacity) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const op = Math.min(1, Math.max(0, opacity));
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, opacity: op } : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {{ text?: string, style?: object }} patch
 */
export function setClipText(project, clipId, patch) {
  const found = findClip(project, clipId);
  if (!found || (found.clip.kind !== 'text' && found.clip.kind !== 'caption')) return project;
  const text = patch.text != null ? String(patch.text) : found.clip.text;
  const style = patch.style
    ? normalizeVideoTextStyle({ ...found.clip.style, ...patch.style })
    : found.clip.style;
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, text, style } : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {Partial<import('./video-filters.js').VideoFilterParams>} filter
 */
export function setClipFilter(project, clipId, filter) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const nextF = normalizeVideoFilter({ ...found.clip.filter, ...filter });
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, filter: nextF } : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {Partial<import('./video-transitions.js').VideoTransition>} transition
 */
export function setClipTransition(project, clipId, transition) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const nextTr = normalizeTransition({ ...found.clip.transition, ...transition });
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, transition: nextTr } : c))
  ));
}

/**
 * Delete clip and close gap on its track (ripple). Linked partner deleted without ripple on other track.
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 */
export function rippleDeleteClip(project, clipId) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const dur = clipDurationMs(found.clip);
  const start = found.clip.timelineStartMs;
  const partnerId = found.clip.linkedClipId;

  let next = patchTrackClips(project, found.track.id, (clips) => (
    clips
      .filter((c) => c.id !== clipId)
      .map((c) => (
        c.timelineStartMs >= start + dur
          ? { ...c, timelineStartMs: Math.max(0, c.timelineStartMs - dur) }
          : c
      ))
  ));

  if (partnerId) {
    const partner = findClip(next, partnerId);
    if (partner) {
      next = patchTrackClips(next, partner.track.id, (clips) => (
        clips.filter((c) => c.id !== partnerId)
      ));
    }
  }

  next = {
    ...next,
    selectedClipId: next.selectedClipId === clipId || next.selectedClipId === partnerId
      ? null
      : next.selectedClipId,
  };
  return withRecomputedDuration(next);
}

/**
 * Unlink A/V and mute video source audio (keep both clips).
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 */
export function detachAudioFromVideo(project, clipId) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const partnerId = found.clip.linkedClipId;
  let videoClipId = found.track.type === 'video' ? clipId : partnerId;
  let next = unlinkClip(project, clipId);
  if (videoClipId) {
    const vid = findClip(next, videoClipId);
    if (vid && vid.track.type === 'video') {
      next = patchTrackClips(next, vid.track.id, (clips) => (
        clips.map((c) => (c.id === videoClipId ? { ...c, muteSourceAudio: true, linkedClipId: null } : c))
      ));
    }
  }
  return next;
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {string} newMediaId
 */
export function replaceClipMedia(project, clipId, newMediaId) {
  const found = findClip(project, clipId);
  const asset = project.media.find((m) => m.id === newMediaId);
  if (!found || !asset) return project;
  const mediaDur = Math.max(1, asset.durationMs || clipDurationMs(found.clip));
  let nextClip = {
    ...found.clip,
    mediaId: newMediaId,
    sourceInMs: 0,
    sourceOutMs: Math.min(mediaDur, clipDurationMs(found.clip) || mediaDur),
  };
  if (asset.kind === 'image' && found.clip.kind === 'media') {
    nextClip.sourceOutMs = Math.max(nextClip.sourceOutMs, VIDEO_IMAGE_DEFAULT_MS);
  }
  let next = patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? nextClip : c))
  ));
  if (found.clip.linkedClipId && asset.kind === 'video') {
    const partner = findClip(next, found.clip.linkedClipId);
    if (partner) {
      next = patchTrackClips(next, partner.track.id, (clips) => (
        clips.map((c) => (c.id === partner.clip.id
          ? { ...c, mediaId: newMediaId, sourceInMs: nextClip.sourceInMs, sourceOutMs: nextClip.sourceOutMs }
          : c))
      ));
    }
  }
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {number} timeMs
 * @param {string} [label]
 */
export function addMarker(project, timeMs, label = '') {
  const marker = {
    id: crypto.randomUUID(),
    timeMs: Math.max(0, timeMs),
    label: String(label || ''),
  };
  return { ...project, markers: [...(project.markers || []), marker] };
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} markerId
 */
export function removeMarker(project, markerId) {
  return {
    ...project,
    markers: (project.markers || []).filter((m) => m.id !== markerId),
  };
}

/**
 * Copy text style and/or filter from source clip onto target.
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} sourceClipId
 * @param {string} targetClipId
 */
export function pasteStyle(project, sourceClipId, targetClipId) {
  const src = findClip(project, sourceClipId);
  const dst = findClip(project, targetClipId);
  if (!src || !dst) return project;
  let patch = {};
  if (src.clip.style && (dst.clip.kind === 'text' || dst.clip.kind === 'caption')) {
    patch.style = { ...src.clip.style };
  }
  if (src.clip.filter) {
    patch.filter = { ...src.clip.filter };
  }
  if (!Object.keys(patch).length) return project;
  return patchTrackClips(project, dst.track.id, (clips) => (
    clips.map((c) => (c.id === targetClipId ? { ...c, ...patch } : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} [text]
 * @param {{ timelineStartMs?: number, durationMs?: number, style?: object }} [opts]
 */
export function addCaptionClip(project, text = 'Caption', opts = {}) {
  const start = Math.max(0, opts.timelineStartMs ?? project.playheadMs ?? 0);
  const { project: withTrack, track } = ensureTrack(project, 'captions');
  const style = normalizeVideoTextStyle(opts.style || defaultCaptionStyle());
  const dur = Math.max(200, opts.durationMs ?? VIDEO_CAPTION_DEFAULT_MS);
  const clip = createClip({
    kind: 'caption',
    mediaId: null,
    trackId: track.id,
    timelineStartMs: start,
    sourceInMs: 0,
    sourceOutMs: dur,
    text: String(text || 'Caption'),
    style,
    transform: defaultTransform(withTrack.width, withTrack.height, withTrack.width * 0.8, 80),
  });
  // Place near bottom third
  clip.transform.y = Math.round(withTrack.height * 0.78);
  clip.transform.x = Math.round(withTrack.width * 0.1);
  let next = patchTrackClips(withTrack, track.id, (clips) => [...clips, clip]);
  next = { ...next, selectedClipId: clip.id };
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} srtText
 */
export function importSrtToProject(project, srtText) {
  const cues = parseSrt(srtText);
  if (!cues.length) return project;
  let next = project;
  const { project: withTrack, track } = ensureTrack(next, 'captions');
  next = withTrack;
  // Clear existing caption clips on this track
  next = patchTrackClips(next, track.id, () => []);
  for (const cue of cues) {
    const dur = Math.max(200, Math.round((cue.endSec - cue.startSec) * 1000));
    const clip = createClip({
      kind: 'caption',
      mediaId: null,
      trackId: track.id,
      timelineStartMs: Math.round(cue.startSec * 1000),
      sourceInMs: 0,
      sourceOutMs: dur,
      text: cue.text,
      style: defaultCaptionStyle(),
      transform: defaultTransform(next.width, next.height, next.width * 0.8, 80),
    });
    clip.transform.y = Math.round(next.height * 0.78);
    clip.transform.x = Math.round(next.width * 0.1);
    next = patchTrackClips(next, track.id, (clips) => [...clips, clip]);
  }
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {number} speed
 */
export function setClipSpeed(project, clipId, speed) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const nextSpeed = normalizeSpeed(speed);
  let next = patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, speed: nextSpeed } : c))
  ));
  if (found.clip.linkedClipId) {
    const partner = findClip(next, found.clip.linkedClipId);
    if (partner) {
      next = patchTrackClips(next, partner.track.id, (clips) => (
        clips.map((c) => (c.id === partner.clip.id ? { ...c, speed: nextSpeed } : c))
      ));
    }
  }
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {boolean} freeze
 */
export function setClipFreeze(project, clipId, freeze) {
  const found = findClip(project, clipId);
  if (!found) return project;
  return withRecomputedDuration(patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, freeze: Boolean(freeze), reverse: freeze ? false : c.reverse } : c))
  )));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {boolean} reverse
 */
export function setClipReverse(project, clipId, reverse) {
  const found = findClip(project, clipId);
  if (!found) return project;
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, reverse: Boolean(reverse), freeze: reverse ? false : c.freeze } : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {{ fadeInMs?: number, fadeOutMs?: number }} fades
 */
export function setClipFades(project, clipId, fades) {
  const found = findClip(project, clipId);
  if (!found) return project;
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId
      ? {
        ...c,
        fadeInMs: fades.fadeInMs != null ? Math.max(0, fades.fadeInMs) : c.fadeInMs,
        fadeOutMs: fades.fadeOutMs != null ? Math.max(0, fades.fadeOutMs) : c.fadeOutMs,
      }
      : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {'none'|'music'|'vo'} audioRole
 */
export function setClipAudioRole(project, clipId, audioRole) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const role = audioRole === 'music' || audioRole === 'vo' ? audioRole : 'none';
  return patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, audioRole: role } : c))
  ));
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} trackId
 * @param {boolean} solo
 */
export function setTrackSolo(project, trackId, solo) {
  return {
    ...project,
    tracks: project.tracks.map((t) => (
      t.id === trackId
        ? { ...t, solo: Boolean(solo) }
        : solo
          ? { ...t, solo: false }
          : t
    )),
  };
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} trackId
 * @param {(clips: import('./video-project.js').VideoClip[]) => import('./video-project.js').VideoClip[]} fn
 */
function patchTrackClips(project, trackId, fn) {
  return {
    ...project,
    tracks: project.tracks.map((t) => (
      t.id === trackId ? { ...t, clips: fn(t.clips) } : t
    )),
  };
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {number} playheadMs
 */
export function splitClipAtPlayhead(project, clipId, playheadMs) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const { clip, track } = found;
  if (track.locked) return project;
  const local = playheadMs - clip.timelineStartMs;
  if (local <= 1 || local >= clipDurationMs(clip) - 1) return project;

  const sourceSplit = clip.sourceInMs + local;
  const left = {
    ...clip,
    sourceOutMs: sourceSplit,
  };
  const right = {
    ...clip,
    id: crypto.randomUUID(),
    timelineStartMs: playheadMs,
    sourceInMs: sourceSplit,
    linkedClipId: null,
  };

  let next = patchTrackClips(project, track.id, (clips) => (
    clips.flatMap((c) => (c.id === clip.id ? [left, right] : [c]))
  ));

  // Split linked partner if present and aligned
  if (clip.linkedClipId) {
    const partner = findClip(next, clip.linkedClipId);
    if (partner && !partner.track.locked) {
      const pLocal = playheadMs - partner.clip.timelineStartMs;
      if (pLocal > 1 && pLocal < clipDurationMs(partner.clip) - 1) {
        const pSplit = partner.clip.sourceInMs + pLocal;
        const pLeft = { ...partner.clip, sourceOutMs: pSplit, linkedClipId: left.id };
        const pRight = {
          ...partner.clip,
          id: crypto.randomUUID(),
          timelineStartMs: playheadMs,
          sourceInMs: pSplit,
          linkedClipId: right.id,
        };
        left.linkedClipId = pLeft.id;
        right.linkedClipId = pRight.id;
        next = patchTrackClips(next, partner.track.id, (clips) => (
          clips.flatMap((c) => (c.id === partner.clip.id ? [pLeft, pRight] : [c]))
        ));
        next = patchTrackClips(next, track.id, (clips) => (
          clips.map((c) => {
            if (c.id === left.id) return { ...c, linkedClipId: pLeft.id };
            if (c.id === right.id) return { ...c, linkedClipId: pRight.id };
            return c;
          })
        ));
      }
    }
  }

  next = { ...next, selectedClipId: right.id };
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {'left'|'right'} edge
 * @param {number} timelineMs  absolute timeline time for the dragged edge
 * @param {boolean} [snap]
 */
export function trimClipEdge(project, clipId, edge, timelineMs, snap = false) {
  const found = findClip(project, clipId);
  if (!found || found.track.locked) return project;
  let t = Math.max(0, timelineMs);
  if (snap) t = snapTime(project, t, clipId, project.playheadMs);

  const clip = found.clip;
  const media = project.media.find((m) => m.id === clip.mediaId);
  const mediaDur = media?.durationMs || clip.sourceOutMs;
  let nextClip = { ...clip };

  if (edge === 'left') {
    const end = clipEndMs(clip);
    const newStart = Math.min(t, end - 1);
    const delta = newStart - clip.timelineStartMs;
    nextClip.timelineStartMs = newStart;
    nextClip.sourceInMs = Math.min(clip.sourceOutMs - 1, Math.max(0, clip.sourceInMs + delta));
  } else {
    const newEnd = Math.max(t, clip.timelineStartMs + 1);
    const newDur = newEnd - clip.timelineStartMs;
    // Text/sticker/generated can extend freely; media clips clamp to source duration
    if (clip.kind === 'text' || clip.kind === 'sticker' || !clip.mediaId) {
      nextClip.sourceOutMs = clip.sourceInMs + newDur;
    } else {
      nextClip.sourceOutMs = Math.min(mediaDur, clip.sourceInMs + newDur);
    }
  }

  let next = patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? nextClip : c))
  ));

  if (clip.linkedClipId) {
    const partner = findClip(next, clip.linkedClipId);
    if (partner && !partner.track.locked) {
      const p = {
        ...partner.clip,
        timelineStartMs: nextClip.timelineStartMs,
        sourceInMs: nextClip.sourceInMs,
        sourceOutMs: nextClip.sourceOutMs,
      };
      next = patchTrackClips(next, partner.track.id, (clips) => (
        clips.map((c) => (c.id === partner.clip.id ? p : c))
      ));
    }
  }

  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {number} timelineStartMs
 * @param {boolean} [snap]
 */
export function moveClip(project, clipId, timelineStartMs, snap = false) {
  const found = findClip(project, clipId);
  if (!found || found.track.locked) return project;
  let start = Math.max(0, timelineStartMs);
  if (snap) start = snapTime(project, start, clipId, project.playheadMs);

  const applyMove = (proj, id, s) => {
    const f = findClip(proj, id);
    if (!f) return proj;
    return patchTrackClips(proj, f.track.id, (clips) => (
      clips.map((c) => (c.id === id ? { ...c, timelineStartMs: s } : c))
    ));
  };

  let next = applyMove(project, clipId, start);
  if (found.clip.linkedClipId) {
    next = applyMove(next, found.clip.linkedClipId, start);
  }
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 */
export function deleteClip(project, clipId) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const ids = new Set([clipId]);
  if (found.clip.linkedClipId) ids.add(found.clip.linkedClipId);

  let next = {
    ...project,
    tracks: project.tracks.map((t) => ({
      ...t,
      clips: t.clips.filter((c) => !ids.has(c.id)),
    })),
    selectedClipId: project.selectedClipId && ids.has(project.selectedClipId)
      ? null
      : project.selectedClipId,
  };
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 */
export function duplicateClip(project, clipId) {
  const found = findClip(project, clipId);
  if (!found || found.track.locked) return project;
  const copy = {
    ...found.clip,
    id: crypto.randomUUID(),
    timelineStartMs: clipEndMs(found.clip),
    linkedClipId: null,
  };
  let next = patchTrackClips(project, found.track.id, (clips) => [...clips, copy]);
  next = { ...next, selectedClipId: copy.id };
  return withRecomputedDuration(next);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 * @param {number} volume
 */
export function setClipVolume(project, clipId, volume) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const vol = Math.min(1, Math.max(0, volume));
  let next = patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, volume: vol } : c))
  ));
  if (found.clip.linkedClipId) {
    const partner = findClip(next, found.clip.linkedClipId);
    if (partner) {
      next = patchTrackClips(next, partner.track.id, (clips) => (
        clips.map((c) => (c.id === partner.clip.id ? { ...c, volume: vol } : c))
      ));
    }
  }
  return next;
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipId
 */
export function unlinkClip(project, clipId) {
  const found = findClip(project, clipId);
  if (!found) return project;
  const partnerId = found.clip.linkedClipId;
  let next = patchTrackClips(project, found.track.id, (clips) => (
    clips.map((c) => (c.id === clipId ? { ...c, linkedClipId: null } : c))
  ));
  if (partnerId) {
    const partner = findClip(next, partnerId);
    if (partner) {
      next = patchTrackClips(next, partner.track.id, (clips) => (
        clips.map((c) => (c.id === partnerId ? { ...c, linkedClipId: null } : c))
      ));
    }
  }
  return next;
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} clipAId
 * @param {string} clipBId
 */
export function linkAvPair(project, clipAId, clipBId) {
  const a = findClip(project, clipAId);
  const b = findClip(project, clipBId);
  if (!a || !b) return project;
  if (a.track.type === b.track.type) return project;
  let next = patchTrackClips(project, a.track.id, (clips) => (
    clips.map((c) => (c.id === clipAId ? { ...c, linkedClipId: clipBId } : c))
  ));
  next = patchTrackClips(next, b.track.id, (clips) => (
    clips.map((c) => (c.id === clipBId ? { ...c, linkedClipId: clipAId } : c))
  ));
  return next;
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {string} trackId
 * @param {Partial<{ muted: boolean, locked: boolean, hidden: boolean, name: string }>} patch
 */
export function patchTrack(project, trackId, patch) {
  return {
    ...project,
    tracks: project.tracks.map((t) => (t.id === trackId ? { ...t, ...patch } : t)),
  };
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {import('./video-project.js').TrackType} type
 */
export function addTrack(project, type) {
  const count = project.tracks.filter((t) => t.type === type).length + 1;
  const labels = {
    video: 'Video', audio: 'Audio', overlay: 'Overlay', text: 'Text', sticker: 'Sticker', captions: 'Captions',
  };
  const track = createTrack({
    type,
    name: `${labels[type] || type} ${count}`,
  });
  return { ...project, tracks: [...project.tracks, track] };
}

/**
 * Snap time to playhead, 0, markers, or other clip edges.
 * @param {import('./video-project.js').VideoProject} project
 * @param {number} timeMs
 * @param {string} [excludeClipId]
 * @param {number} [playheadMs]
 */
export function snapTime(project, timeMs, excludeClipId, playheadMs) {
  /** @type {number[]} */
  const targets = [0];
  if (playheadMs != null) targets.push(playheadMs);
  for (const m of project.markers || []) targets.push(m.timeMs);
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.id === excludeClipId) continue;
      targets.push(clip.timelineStartMs, clipEndMs(clip));
    }
  }
  let best = timeMs;
  let bestDist = SNAP_THRESHOLD_MS;
  for (const t of targets) {
    const d = Math.abs(t - timeMs);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return best;
}

/**
 * Build ordered video segments for export (primary video track stack — topmost wins per time range simplified as sequential non-overlapping from first video track; multi-track: use topmost).
 * Plan 1: concatenate clips from the first non-hidden video track in timeline order; if empty, black.
 * @param {import('./video-project.js').VideoProject} project
 * @returns {Array<{ clip: import('./video-project.js').VideoClip, media: import('./video-project.js').MediaAsset, startMs: number, durationMs: number }>}
 */
export function buildExportVideoSegments(project) {
  const track = project.tracks.find((t) => t.type === 'video' && !t.hidden)
    || project.tracks.find((t) => t.type === 'video');
  if (!track) return [];
  const sorted = [...track.clips].sort((a, b) => a.timelineStartMs - b.timelineStartMs);
  /** @type {Array<{ clip: import('./video-project.js').VideoClip, media: import('./video-project.js').MediaAsset, startMs: number, durationMs: number }>} */
  const segs = [];
  for (const clip of sorted) {
    const media = project.media.find((m) => m.id === clip.mediaId);
    if (!media) continue;
    segs.push({
      clip,
      media,
      startMs: clip.sourceInMs,
      durationMs: clipDurationMs(clip),
    });
  }
  return segs;
}

/**
 * Audio clips for export (all unmuted audio tracks + video-linked audio as separate entries).
 * @param {import('./video-project.js').VideoProject} project
 */
export function buildExportAudioSegments(project) {
  /** @type {Array<{ clip: import('./video-project.js').VideoClip, media: import('./video-project.js').MediaAsset, timelineStartMs: number, startMs: number, durationMs: number, volume: number }>} */
  const segs = [];
  for (const track of project.tracks) {
    if (track.muted || track.hidden) continue;
    if (track.type !== 'audio') continue;
    for (const clip of track.clips) {
      const media = project.media.find((m) => m.id === clip.mediaId);
      if (!media) continue;
      segs.push({
        clip,
        media,
        timelineStartMs: clip.timelineStartMs,
        startMs: clip.sourceInMs,
        durationMs: clipDurationMs(clip),
        volume: clip.volume,
      });
    }
  }
  return segs;
}
