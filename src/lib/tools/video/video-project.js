import { defaultDuckSettings, normalizeDuckSettings } from './video-duck.js';
import { VIDEO_ASPECT_PRESETS, VIDEO_IMAGE_DEFAULT_MS } from './video-limits.js';
import { defaultVideoFilter, normalizeVideoFilter } from './video-filters.js';
import { normalizeSpeed, timelineDurationMs } from './video-speed.js';
import { defaultTransition, normalizeTransition } from './video-transitions.js';
import { defaultVideoTextStyle, normalizeVideoTextStyle } from './video-text.js';
import { defaultCaptionStyle } from './video-captions.js';

export const VIDEO_SCHEMA_VERSION = 3;

/**
 * @typedef {'video'|'audio'|'image'} MediaKind
 * @typedef {'video'|'audio'|'overlay'|'text'|'sticker'|'captions'} TrackType
 * @typedef {'media'|'text'|'sticker'|'caption'} ClipKind
 * @typedef {'none'|'music'|'vo'} AudioRole
 *
 * @typedef {Object} MediaAsset
 * @property {string} id
 * @property {string} name
 * @property {MediaKind} kind
 * @property {string} mime
 * @property {Blob} blob
 * @property {string} objectUrl
 * @property {number} durationMs
 * @property {number} width
 * @property {number} height
 * @property {number} fileBytes
 * @property {boolean} [fromVo]
 *
 * @typedef {Object} ClipTransform
 * @property {number} x
 * @property {number} y
 * @property {number} scale
 * @property {number} rotation
 *
 * @typedef {Object} TimelineMarker
 * @property {string} id
 * @property {number} timeMs
 * @property {string} label
 *
 * @typedef {Object} VideoClip
 * @property {string} id
 * @property {ClipKind} kind
 * @property {string | null} mediaId
 * @property {string} trackId
 * @property {number} timelineStartMs
 * @property {number} sourceInMs
 * @property {number} sourceOutMs
 * @property {number} volume
 * @property {string | null} linkedClipId
 * @property {ClipTransform} transform
 * @property {number} opacity
 * @property {import('./video-filters.js').VideoFilterParams} filter
 * @property {import('./video-transitions.js').VideoTransition} transition
 * @property {number} speed
 * @property {boolean} reverse
 * @property {boolean} freeze
 * @property {number} fadeInMs
 * @property {number} fadeOutMs
 * @property {AudioRole} audioRole
 * @property {string} [text]
 * @property {import('./video-text.js').VideoTextStyle} [style]
 * @property {string | null} [graphicId]
 * @property {boolean} [muteSourceAudio]
 *
 * @typedef {Object} VideoTrack
 * @property {string} id
 * @property {TrackType} type
 * @property {string} name
 * @property {boolean} muted
 * @property {boolean} locked
 * @property {boolean} hidden
 * @property {boolean} [solo]
 * @property {VideoClip[]} clips
 *
 * @typedef {Object} VideoProject
 * @property {string} id
 * @property {number} schemaVersion
 * @property {string} title
 * @property {string} aspectId
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {number} durationMs
 * @property {MediaAsset[]} media
 * @property {VideoTrack[]} tracks
 * @property {TimelineMarker[]} markers
 * @property {import('./video-duck.js').DuckSettings} duck
 * @property {string | null} selectedClipId
 * @property {number} playheadMs
 */

const TRACK_DEFAULT_NAMES = {
  video: 'Video',
  audio: 'Audio',
  overlay: 'Overlay',
  text: 'Text',
  sticker: 'Sticker',
  captions: 'Captions',
};

/**
 * @param {number} projectWidth
 * @param {number} projectHeight
 * @param {number} [boxW]
 * @param {number} [boxH]
 */
export function defaultTransform(projectWidth, projectHeight, boxW = 320, boxH = 120) {
  return {
    x: Math.max(0, (projectWidth - boxW) / 2),
    y: Math.max(0, (projectHeight - boxH) / 2),
    scale: 1,
    rotation: 0,
  };
}

/** @returns {VideoProject} */
export function createEmptyProject() {
  const aspect = VIDEO_ASPECT_PRESETS[0];
  return {
    id: crypto.randomUUID(),
    schemaVersion: VIDEO_SCHEMA_VERSION,
    title: 'Untitled',
    aspectId: aspect.id,
    width: aspect.width,
    height: aspect.height,
    fps: 30,
    durationMs: 0,
    media: [],
    tracks: [
      createTrack({ type: 'video', name: 'Video' }),
      createTrack({ type: 'audio', name: 'Audio' }),
    ],
    markers: [],
    duck: defaultDuckSettings(),
    selectedClipId: null,
    playheadMs: 0,
  };
}

/**
 * @param {Partial<VideoTrack> & { type: TrackType }} opts
 */
export function createTrack(opts) {
  return {
    id: opts.id || crypto.randomUUID(),
    type: opts.type,
    name: opts.name || TRACK_DEFAULT_NAMES[opts.type] || opts.type,
    muted: Boolean(opts.muted),
    locked: Boolean(opts.locked),
    hidden: Boolean(opts.hidden),
    solo: Boolean(opts.solo),
    clips: opts.clips ? opts.clips.map(cloneClip) : [],
  };
}

/**
 * @param {Partial<VideoClip> & { trackId: string }} opts
 */
export function createClip(opts) {
  const kind = opts.kind || 'media';
  const sourceIn = Math.max(0, opts.sourceInMs ?? 0);
  const sourceOut = Math.max(sourceIn + 1, opts.sourceOutMs ?? VIDEO_IMAGE_DEFAULT_MS);
  const needsStyle = kind === 'text' || kind === 'caption' || opts.style;
  return {
    id: opts.id || crypto.randomUUID(),
    kind,
    mediaId: opts.mediaId ?? null,
    trackId: opts.trackId,
    timelineStartMs: Math.max(0, opts.timelineStartMs ?? 0),
    sourceInMs: sourceIn,
    sourceOutMs: sourceOut,
    volume: opts.volume == null ? 1 : Math.min(1, Math.max(0, opts.volume)),
    linkedClipId: opts.linkedClipId ?? null,
    transform: normalizeTransform(opts.transform),
    opacity: opts.opacity == null ? 1 : Math.min(1, Math.max(0, opts.opacity)),
    filter: normalizeVideoFilter(opts.filter),
    transition: normalizeTransition(opts.transition),
    speed: normalizeSpeed(opts.speed ?? 1),
    reverse: Boolean(opts.reverse),
    freeze: Boolean(opts.freeze),
    fadeInMs: Math.max(0, Number(opts.fadeInMs) || 0),
    fadeOutMs: Math.max(0, Number(opts.fadeOutMs) || 0),
    audioRole: opts.audioRole === 'music' || opts.audioRole === 'vo' ? opts.audioRole : 'none',
    text: opts.text != null
      ? String(opts.text)
      : kind === 'text' || kind === 'caption'
        ? (kind === 'caption' ? 'Caption' : 'Text')
        : undefined,
    style: needsStyle
      ? normalizeVideoTextStyle(opts.style || (kind === 'caption' ? defaultCaptionStyle() : defaultVideoTextStyle()))
      : undefined,
    graphicId: opts.graphicId ?? null,
    muteSourceAudio: Boolean(opts.muteSourceAudio),
  };
}

/** @param {Partial<ClipTransform> | null | undefined} t */
export function normalizeTransform(t) {
  return {
    x: Number.isFinite(t?.x) ? Number(t.x) : 0,
    y: Number.isFinite(t?.y) ? Number(t.y) : 0,
    scale: Math.max(0.05, Math.min(8, Number.isFinite(t?.scale) ? Number(t.scale) : 1)),
    rotation: Number.isFinite(t?.rotation) ? Number(t.rotation) : 0,
  };
}

/** Timeline duration (speed-aware). */
export function clipDurationMs(clip) {
  return timelineDurationMs(clip);
}

/** @param {VideoClip} clip */
export function clipEndMs(clip) {
  return clip.timelineStartMs + clipDurationMs(clip);
}

/** @param {VideoTrack} track @param {VideoClip} clip */
export function isOverlayClip(track, clip) {
  return track.type === 'overlay' || track.type === 'text' || track.type === 'sticker'
    || clip.kind === 'text' || clip.kind === 'sticker';
}

/** @param {VideoProject} project */
export function computeProjectDuration(project) {
  let max = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clipEndMs(clip));
    }
  }
  return max;
}

/** @param {VideoProject} project */
export function withRecomputedDuration(project) {
  return { ...project, durationMs: computeProjectDuration(project) };
}

/** @param {VideoClip} clip */
export function cloneClip(clip) {
  return {
    ...clip,
    transform: { ...clip.transform },
    filter: { ...clip.filter },
    transition: { ...clip.transition },
    style: clip.style ? { ...clip.style } : undefined,
  };
}

/** @param {VideoTrack} track */
export function cloneTrack(track) {
  return { ...track, clips: track.clips.map(cloneClip) };
}

/** @param {VideoProject} project */
export function cloneProject(project) {
  return {
    id: project.id || crypto.randomUUID(),
    schemaVersion: project.schemaVersion || VIDEO_SCHEMA_VERSION,
    title: project.title,
    aspectId: project.aspectId,
    width: project.width,
    height: project.height,
    fps: project.fps,
    durationMs: project.durationMs,
    media: project.media.map((m) => ({ ...m })),
    tracks: project.tracks.map(cloneTrack),
    markers: (project.markers || []).map((m) => ({ ...m })),
    duck: normalizeDuckSettings(project.duck),
    selectedClipId: project.selectedClipId,
    playheadMs: project.playheadMs,
  };
}

/**
 * @param {VideoProject} project
 * @param {string} clipId
 */
export function findClip(project, clipId) {
  for (let ti = 0; ti < project.tracks.length; ti += 1) {
    const track = project.tracks[ti];
    const ci = track.clips.findIndex((c) => c.id === clipId);
    if (ci >= 0) return { track, clip: track.clips[ci], trackIndex: ti, clipIndex: ci };
  }
  return null;
}

/** @param {VideoProject} project */
export function getSelectedClip(project) {
  if (!project.selectedClipId) return null;
  return findClip(project, project.selectedClipId)?.clip ?? null;
}

/** @param {VideoProject} project @param {string} mediaId */
export function getMedia(project, mediaId) {
  return project.media.find((m) => m.id === mediaId) ?? null;
}

/** @param {VideoProject} project @param {number} playheadMs */
export function getVideoClipAtPlayhead(project, playheadMs) {
  const videoTracks = project.tracks.filter((t) => t.type === 'video' && !t.hidden);
  for (let i = videoTracks.length - 1; i >= 0; i -= 1) {
    const track = videoTracks[i];
    for (const clip of track.clips) {
      if (clip.kind && clip.kind !== 'media') continue;
      if (playheadMs >= clip.timelineStartMs && playheadMs < clipEndMs(clip)) {
        return clip;
      }
    }
  }
  return null;
}

/** @param {VideoProject} project @param {number} playheadMs */
export function getAudioClipsAtPlayhead(project, playheadMs) {
  /** @type {VideoClip[]} */
  const out = [];
  const anySolo = project.tracks.some((t) => t.solo);
  for (const track of project.tracks) {
    if (track.type !== 'audio' || track.muted || track.hidden) continue;
    if (anySolo && !track.solo) continue;
    for (const clip of track.clips) {
      if (playheadMs >= clip.timelineStartMs && playheadMs < clipEndMs(clip)) out.push(clip);
    }
  }
  for (const track of project.tracks) {
    if (track.type !== 'video' || track.muted || track.hidden) continue;
    if (anySolo && !track.solo) continue;
    for (const clip of track.clips) {
      if (clip.muteSourceAudio) continue;
      const media = getMedia(project, clip.mediaId);
      if (media?.kind !== 'video') continue;
      if (playheadMs >= clip.timelineStartMs && playheadMs < clipEndMs(clip)) out.push(clip);
    }
  }
  return out;
}

/** @param {VideoProject} project @param {string} aspectId */
export function setProjectAspect(project, aspectId) {
  const preset = VIDEO_ASPECT_PRESETS.find((p) => p.id === aspectId) || VIDEO_ASPECT_PRESETS[0];
  return {
    ...project,
    aspectId: preset.id,
    width: preset.width,
    height: preset.height,
  };
}

/** @param {VideoProject} project @param {Partial<import('./video-duck.js').DuckSettings>} duck */
export function setProjectDuck(project, duck) {
  return { ...project, duck: normalizeDuckSettings({ ...project.duck, ...duck }) };
}

/** @param {number} ms @param {number} [fps] */
export function formatTimecode(ms, fps = 30) {
  const totalSec = Math.max(0, ms) / 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const f = Math.floor((Math.max(0, ms) / 1000) * fps) % Math.round(fps);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  return `${pad(m)}:${pad(s)}:${pad(f)}`;
}

export { defaultVideoFilter, defaultTransition, defaultVideoTextStyle, defaultDuckSettings };
