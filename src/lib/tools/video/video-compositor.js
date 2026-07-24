import { clipDurationMs, clipEndMs, getMedia, isOverlayClip } from './video-project.js';
import { cssFilterFromParams } from './video-filters.js';
import { hasTransition } from './video-transitions.js';
import { sourceTimeSecAtPlayhead, normalizeSpeed } from './video-speed.js';
import { duckGainAtPlayhead, isVoActiveAtPlayhead } from './video-duck.js';

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {number} playheadMs
 */
export function getOverlayClipsAtPlayhead(project, playheadMs) {
  /** @type {Array<{ clip: import('./video-project.js').VideoClip, track: import('./video-project.js').VideoTrack, media: import('./video-project.js').MediaAsset | null }>} */
  const out = [];
  for (const track of project.tracks) {
    if (track.hidden) continue;
    if (track.type !== 'overlay' && track.type !== 'text' && track.type !== 'sticker') continue;
    for (const clip of track.clips) {
      if (playheadMs >= clip.timelineStartMs && playheadMs < clipEndMs(clip)) {
        out.push({
          clip,
          track,
          media: clip.mediaId ? getMedia(project, clip.mediaId) : null,
        });
      }
    }
  }
  return out;
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {number} playheadMs
 */
export function getCaptionsAtPlayhead(project, playheadMs) {
  /** @type {import('./video-project.js').VideoClip[]} */
  const out = [];
  for (const track of project.tracks) {
    if (track.type !== 'captions' || track.hidden) continue;
    for (const clip of track.clips) {
      if (clip.kind !== 'caption') continue;
      if (playheadMs >= clip.timelineStartMs && playheadMs < clipEndMs(clip)) out.push(clip);
    }
  }
  return out;
}

export function cssFilterFromClip(clip) {
  return cssFilterFromParams(clip?.filter);
}

export function transformStyle(clip, projectWidth, projectHeight) {
  const t = clip.transform || { x: 0, y: 0, scale: 1, rotation: 0 };
  return {
    left: `${(t.x / Math.max(1, projectWidth)) * 100}%`,
    top: `${(t.y / Math.max(1, projectHeight)) * 100}%`,
    transform: `scale(${t.scale}) rotate(${t.rotation}deg)`,
    transformOrigin: 'top left',
    opacity: clip.opacity == null ? 1 : clip.opacity,
  };
}

export function getTransitionAtPlayhead(project, playheadMs) {
  const track = project.tracks.find((t) => t.type === 'video' && !t.hidden)
    || project.tracks.find((t) => t.type === 'video');
  if (!track) return null;
  const sorted = [...track.clips]
    .filter((c) => c.kind === 'media' || !c.kind)
    .sort((a, b) => a.timelineStartMs - b.timelineStartMs);

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const out = sorted[i];
    const incoming = sorted[i + 1];
    if (!hasTransition(out.transition)) continue;
    const dur = out.transition.durationMs;
    const end = clipEndMs(out);
    const windowStart = Math.max(out.timelineStartMs, end - dur);
    if (playheadMs >= windowStart && playheadMs <= end + dur * 0.5) {
      return {
        outgoing: out,
        incoming,
        progress: Math.min(1, Math.max(0, (playheadMs - windowStart) / dur)),
        type: out.transition.type,
      };
    }
  }
  return null;
}

export function clipUsesTransformHandles(track, clip) {
  return isOverlayClip(track, clip);
}

/**
 * @param {import('./video-project.js').VideoProject} project
 * @param {number} playheadMs
 * @param {import('./video-project.js').VideoClip} clip
 */
export function previewVolumeForClip(project, playheadMs, clip) {
  let vol = clip.volume ?? 1;
  const local = playheadMs - clip.timelineStartMs;
  const dur = clipDurationMs(clip);
  if ((clip.fadeInMs || 0) > 0 && local < clip.fadeInMs) vol *= local / clip.fadeInMs;
  if ((clip.fadeOutMs || 0) > 0 && local > dur - clip.fadeOutMs) {
    vol *= Math.max(0, (dur - local) / clip.fadeOutMs);
  }
  const voActive = isVoActiveAtPlayhead(project, playheadMs);
  const media = clip.mediaId ? getMedia(project, clip.mediaId) : null;
  const isVo = clip.audioRole === 'vo' || Boolean(media?.fromVo);
  if (!isVo) vol *= duckGainAtPlayhead(project.duck, voActive);
  return Math.min(1, Math.max(0, vol));
}

export { clipDurationMs, sourceTimeSecAtPlayhead, normalizeSpeed };
