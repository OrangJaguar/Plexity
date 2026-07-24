import { clipDurationMs, clipEndMs, getMedia } from './video-project.js';
import { ffmpegEqFromParams, isIdentityFilter } from './video-filters.js';
import { hasTransition, xfadeNameForType } from './video-transitions.js';
import { ffmpegSpeedFilters, normalizeSpeed } from './video-speed.js';
import { buildDuckEnvelopes } from './video-duck.js';
import { projectToCaptionCues } from './video-captions.js';

/**
 * @typedef {Object} ExportVideoLayer
 * @property {'base'|'overlay'|'text'|'sticker'|'caption'} role
 * @property {import('./video-project.js').VideoClip} clip
 * @property {import('./video-project.js').MediaAsset | null} media
 * @property {number} timelineStartMs
 * @property {number} durationMs
 * @property {number} sourceInMs
 * @property {string | null} filterEq
 * @property {{ x: number, y: number, scale: number, rotation: number }} transform
 * @property {number} opacity
 * @property {number} speed
 * @property {boolean} reverse
 * @property {boolean} freeze
 * @property {string[]} speedVf
 * @property {string} [text]
 * @property {object} [style]
 */

/**
 * @typedef {Object} ExportAudioLayer
 * @property {import('./video-project.js').VideoClip} clip
 * @property {import('./video-project.js').MediaAsset} media
 * @property {number} timelineStartMs
 * @property {number} sourceInMs
 * @property {number} durationMs
 * @property {number} volume
 * @property {number} delayMs
 * @property {number} fadeInMs
 * @property {number} fadeOutMs
 * @property {string[]} speedAf
 * @property {number} duckGain
 */

/**
 * @typedef {Object} ExportTransitionPlan
 * @property {string} outgoingClipId
 * @property {string} incomingClipId
 * @property {string} type
 * @property {string} xfade
 * @property {number} durationMs
 * @property {number} offsetSec
 */

/**
 * @typedef {Object} ExportGraph
 * @property {number} width
 * @property {number} height
 * @property {number} fps
 * @property {number} durationMs
 * @property {ExportVideoLayer[]} videoLayers
 * @property {ExportAudioLayer[]} audioLayers
 * @property {ExportTransitionPlan[]} transitions
 * @property {import('./video-captions.js').CaptionCue[]} captions
 * @property {ReturnType<typeof buildDuckEnvelopes>} duckEnvelopes
 * @property {boolean} audioOnly
 * @property {string[]} softWarnings
 */

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {{ audioOnly?: boolean }} [opts]
 * @returns {ExportGraph}
 */
export function buildExportGraph(project, opts = {}) {
  /** @type {string[]} */
  const softWarnings = [];
  const width = project.width;
  const height = project.height;
  const fps = project.fps || 30;
  const durationMs = Math.max(project.durationMs, 0);
  const audioOnly = Boolean(opts.audioOnly);

  /** @type {ExportVideoLayer[]} */
  const videoLayers = [];
  /** @type {ExportTransitionPlan[]} */
  const transitions = [];

  if (!audioOnly) {
    const baseTrack = project.tracks.find((t) => t.type === 'video' && !t.hidden)
      || project.tracks.find((t) => t.type === 'video');
    if (baseTrack) {
      const sorted = [...baseTrack.clips]
        .filter((c) => (c.kind === 'media' || !c.kind) && c.mediaId)
        .sort((a, b) => a.timelineStartMs - b.timelineStartMs);
      for (let i = 0; i < sorted.length; i += 1) {
        const clip = sorted[i];
        const media = getMedia(project, clip.mediaId);
        if (!media) {
          softWarnings.push(`Missing media for clip ${clip.id}`);
          continue;
        }
        const { vf } = ffmpegSpeedFilters(clip);
        videoLayers.push({
          role: 'base',
          clip,
          media,
          timelineStartMs: clip.timelineStartMs,
          durationMs: clipDurationMs(clip),
          sourceInMs: clip.sourceInMs,
          filterEq: isIdentityFilter(clip.filter) ? null : ffmpegEqFromParams(clip.filter),
          transform: { ...clip.transform },
          opacity: clip.opacity ?? 1,
          speed: normalizeSpeed(clip.speed ?? 1),
          reverse: Boolean(clip.reverse),
          freeze: Boolean(clip.freeze),
          speedVf: vf,
        });
        if (i < sorted.length - 1 && hasTransition(clip.transition)) {
          const incoming = sorted[i + 1];
          const dur = clip.transition.durationMs;
          const offsetSec = Math.max(0, (clipEndMs(clip) - dur) / 1000);
          transitions.push({
            outgoingClipId: clip.id,
            incomingClipId: incoming.id,
            type: clip.transition.type,
            xfade: xfadeNameForType(clip.transition.type),
            durationMs: dur,
            offsetSec,
          });
        }
      }
    }

    for (const track of project.tracks) {
      if (track.hidden) continue;
      if (track.type !== 'overlay' && track.type !== 'text' && track.type !== 'sticker') continue;
      for (const clip of track.clips) {
        const media = clip.mediaId ? getMedia(project, clip.mediaId) : null;
        const role = clip.kind === 'text' ? 'text' : clip.kind === 'sticker' ? 'sticker' : 'overlay';
        videoLayers.push({
          role,
          clip,
          media,
          timelineStartMs: clip.timelineStartMs,
          durationMs: clipDurationMs(clip),
          sourceInMs: clip.sourceInMs,
          filterEq: null,
          transform: { ...clip.transform },
          opacity: clip.opacity ?? 1,
          speed: 1,
          reverse: false,
          freeze: false,
          speedVf: [],
          text: clip.text,
          style: clip.style,
        });
      }
    }

    for (const track of project.tracks) {
      if (track.type !== 'captions' || track.hidden) continue;
      for (const clip of track.clips) {
        if (clip.kind !== 'caption') continue;
        videoLayers.push({
          role: 'caption',
          clip,
          media: null,
          timelineStartMs: clip.timelineStartMs,
          durationMs: clipDurationMs(clip),
          sourceInMs: 0,
          filterEq: null,
          transform: { ...clip.transform },
          opacity: clip.opacity ?? 1,
          speed: 1,
          reverse: false,
          freeze: false,
          speedVf: [],
          text: clip.text,
          style: clip.style,
        });
      }
    }
  }

  const duckEnvelopes = buildDuckEnvelopes(project);
  const duckByClip = new Map(duckEnvelopes.map((e) => [e.clipId, e.gain]));

  /** @type {ExportAudioLayer[]} */
  const audioLayers = [];
  for (const track of project.tracks) {
    if (track.muted || track.hidden) continue;
    if (track.type === 'audio') {
      for (const clip of track.clips) {
        const media = getMedia(project, clip.mediaId);
        if (!media) continue;
        const { af } = ffmpegSpeedFilters(clip);
        audioLayers.push({
          clip,
          media,
          timelineStartMs: clip.timelineStartMs,
          sourceInMs: clip.sourceInMs,
          durationMs: clipDurationMs(clip),
          volume: clip.volume,
          delayMs: clip.timelineStartMs,
          fadeInMs: clip.fadeInMs || 0,
          fadeOutMs: clip.fadeOutMs || 0,
          speedAf: af,
          duckGain: duckByClip.get(clip.id) ?? 1,
        });
      }
    }
    if (track.type === 'video' && !audioOnly) {
      for (const clip of track.clips) {
        if (clip.muteSourceAudio) continue;
        if (clip.linkedClipId) continue;
        const media = getMedia(project, clip.mediaId);
        if (!media || media.kind !== 'video') continue;
        const { af } = ffmpegSpeedFilters(clip);
        audioLayers.push({
          clip,
          media,
          timelineStartMs: clip.timelineStartMs,
          sourceInMs: clip.sourceInMs,
          durationMs: clipDurationMs(clip),
          volume: clip.volume,
          delayMs: clip.timelineStartMs,
          fadeInMs: clip.fadeInMs || 0,
          fadeOutMs: clip.fadeOutMs || 0,
          speedAf: af,
          duckGain: 1,
        });
      }
    }
  }

  const captions = projectToCaptionCues(project);

  if (videoLayers.length + audioLayers.length > 40) {
    softWarnings.push('Large export graph — encoding may use a lot of memory.');
  }
  if (durationMs > 20 * 60 * 1000) {
    softWarnings.push('Timeline over 20 minutes — export may take a while.');
  }
  if (!videoLayers.some((l) => l.role === 'base') && !audioOnly && !audioLayers.length) {
    softWarnings.push('No video or audio to export.');
  }

  return {
    width,
    height,
    fps,
    durationMs,
    videoLayers,
    audioLayers,
    transitions,
    captions,
    duckEnvelopes,
    audioOnly,
    softWarnings,
  };
}

/**
 * @param {ExportGraph} graph
 */
export function summarizeExportGraph(graph) {
  return {
    baseCount: graph.videoLayers.filter((l) => l.role === 'base').length,
    overlayCount: graph.videoLayers.filter((l) => l.role !== 'base' && l.role !== 'caption').length,
    captionCount: graph.captions.length,
    audioCount: graph.audioLayers.length,
    transitionCount: graph.transitions.length,
    durationMs: graph.durationMs,
    softWarnings: graph.softWarnings,
    audioOnly: graph.audioOnly,
  };
}
