import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import {
  formatTimecode,
  getAudioClipsAtPlayhead,
  getMedia,
  getVideoClipAtPlayhead,
} from '@/lib/tools/video/video-project.js';
import {
  cssFilterFromClip,
  getCaptionsAtPlayhead,
  getOverlayClipsAtPlayhead,
  getTransitionAtPlayhead,
  previewVolumeForClip,
  sourceTimeSecAtPlayhead,
  transformStyle,
  normalizeSpeed,
} from '@/lib/tools/video/video-compositor.js';
import VideoTransformHandles from '@/components/tools/video/VideoTransformHandles';

/** Seek only when scrubbing / clip changes — avoid fighting HTML playback every frame. */
const SEEK_EPS_PLAYING = 0.45;
const SEEK_EPS_PAUSED = 0.04;

/**
 * @param {object} props
 */
export default function VideoPlayer({
  project,
  playing,
  onTogglePlay,
  onSeek,
  onTransformLive,
  onGestureBegin,
  onGestureEnd,
  selectedClipId,
  showSafeMargins = false,
}) {
  const videoRef = useRef(/** @type {HTMLVideoElement | null} */ (null));
  const audioRefs = useRef(/** @type {Map<string, HTMLAudioElement>} */ (new Map()));
  const stageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const lastVideoSyncRef = useRef({ clipId: '', src: '' });
  const [stageReady, setStageReady] = useState(false);

  const playhead = project.playheadMs;
  const videoClip = getVideoClipAtPlayhead(project, playhead);
  const videoMedia = videoClip ? getMedia(project, videoClip.mediaId) : null;
  const overlays = getOverlayClipsAtPlayhead(project, playhead);
  const captions = getCaptionsAtPlayhead(project, playhead);
  const transition = getTransitionAtPlayhead(project, playhead);
  const selectedOverlay = selectedClipId
    ? overlays.find((o) => o.clip.id === selectedClipId)
    : null;

  const audioClips = getAudioClipsAtPlayhead(project, playhead).filter((c) => {
    const media = getMedia(project, c.mediaId);
    if (media?.kind === 'video' && c.linkedClipId) return false;
    if (videoClip && c.id === videoClip.id) return false;
    return true;
  });

  useEffect(() => {
    setStageReady(Boolean(stageRef.current));
  }, [project.width, project.height, videoClip?.id]);

  // Video element sync — seek sparingly while playing
  useEffect(() => {
    const el = videoRef.current;
    if (!videoClip || !videoMedia || videoMedia.kind === 'image') {
      if (el) {
        el.pause();
        if (el.getAttribute('src')) {
          el.removeAttribute('src');
          el.load();
        }
      }
      lastVideoSyncRef.current = { clipId: '', src: '' };
      return;
    }
    if (!el) return;

    const srcChanged = el.getAttribute('src') !== videoMedia.objectUrl;
    if (srcChanged) {
      el.src = videoMedia.objectUrl;
      lastVideoSyncRef.current = { clipId: '', src: videoMedia.objectUrl };
    }

    const localSec = sourceTimeSecAtPlayhead(videoClip, playhead);
    const clipChanged = lastVideoSyncRef.current.clipId !== videoClip.id;
    const eps = playing ? SEEK_EPS_PLAYING : SEEK_EPS_PAUSED;
    const drifted = Math.abs(el.currentTime - localSec) > eps;

    if (clipChanged || srcChanged || !playing || drifted) {
      try {
        el.currentTime = Math.max(0, localSec);
      } catch {
        // ignore seek errors before metadata
      }
      lastVideoSyncRef.current = { clipId: videoClip.id, src: videoMedia.objectUrl };
    }

    const speed = normalizeSpeed(videoClip.speed ?? 1);
    el.playbackRate = videoClip.freeze ? 0.0001 : Math.min(16, Math.max(0.0625, speed));

    const track = project.tracks.find((t) => t.id === videoClip.trackId);
    const anySolo = project.tracks.some((t) => t.solo);
    const soloMuted = anySolo && track && !track.solo;
    // Mute embedded A/V when a linked audio clip exists (played separately)
    const hasLinkedAudio = Boolean(videoClip.linkedClipId);
    const vol = previewVolumeForClip(project, playhead, videoClip);
    const shouldMute = Boolean(
      soloMuted || track?.muted || videoClip.muteSourceAudio || hasLinkedAudio,
    );
    el.volume = shouldMute ? 0 : vol;
    el.muted = shouldMute;

    if (playing && !videoClip.freeze) {
      if (el.paused) void el.play().catch(() => {});
    } else if (!el.paused) {
      el.pause();
    }
  }, [videoClip, videoMedia, playhead, playing, project]);

  // Audio clips sync
  useEffect(() => {
    const wanted = new Set();
    const eps = playing ? SEEK_EPS_PLAYING : SEEK_EPS_PAUSED;

    for (const clip of audioClips) {
      const media = getMedia(project, clip.mediaId);
      if (!media?.objectUrl) continue;
      wanted.add(clip.id);
      let el = audioRefs.current.get(clip.id);
      if (!el) {
        el = new Audio();
        audioRefs.current.set(clip.id, el);
      }
      const srcChanged = el.getAttribute('src') !== media.objectUrl;
      if (srcChanged) el.src = media.objectUrl;

      const localSec = sourceTimeSecAtPlayhead(clip, playhead);
      if (srcChanged || !playing || Math.abs(el.currentTime - localSec) > eps) {
        try {
          el.currentTime = Math.max(0, localSec);
        } catch {
          // ignore
        }
      }

      const speed = normalizeSpeed(clip.speed ?? 1);
      el.playbackRate = clip.freeze ? 0.0001 : Math.min(16, Math.max(0.0625, speed));
      el.volume = previewVolumeForClip(project, playhead, clip);

      if (playing && !clip.freeze) {
        if (el.paused) void el.play().catch(() => {});
      } else if (!el.paused) {
        el.pause();
      }
    }

    for (const [id, el] of audioRefs.current) {
      if (!wanted.has(id)) {
        el.pause();
        el.removeAttribute('src');
        audioRefs.current.delete(id);
      }
    }
  }, [audioClips, playhead, playing, project]);

  useEffect(() => () => {
    for (const el of audioRefs.current.values()) {
      el.pause();
      el.removeAttribute('src');
    }
    audioRefs.current.clear();
  }, []);

  const baseFilter = videoClip ? cssFilterFromClip(videoClip) : 'none';
  const transitionOpacity = transition ? 1 - transition.progress : 1;
  const aspect = `${project.width} / ${project.height}`;

  return (
    <div className="tools-video-player">
      <div className="tools-video-player-stage" ref={stageRef}>
        <div
          className="tools-video-player-frame"
          style={{
            aspectRatio: aspect,
            width: project.width >= project.height ? '100%' : 'auto',
            height: project.width >= project.height ? 'auto' : '100%',
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {videoMedia?.kind === 'image' ? (
            <img
              className="tools-video-player-media"
              alt=""
              src={videoMedia.objectUrl}
              style={{ filter: baseFilter, opacity: transitionOpacity }}
            />
          ) : (
            <video
              ref={videoRef}
              className="tools-video-player-media"
              playsInline
              preload="auto"
              style={{ filter: baseFilter, opacity: transitionOpacity }}
            />
          )}
          {!videoClip ? <div className="tools-video-player-empty" aria-hidden /> : null}

          <div className="tools-video-overlay-stage">
            {overlays.map(({ clip, media }) => {
              const style = transformStyle(clip, project.width, project.height);
              if (clip.kind === 'text') {
                const s = clip.style || {};
                return (
                  <div
                    key={clip.id}
                    className={`tools-video-overlay-item tools-video-overlay-text${selectedClipId === clip.id ? ' is-selected' : ''}`}
                    style={{
                      ...style,
                      color: s.color,
                      fontFamily: s.fontFamily,
                      fontSize: `calc(${(s.fontSize || 48) / project.height} * 100cqh)`,
                      fontWeight: s.fontWeight,
                      fontStyle: s.fontStyle,
                      textAlign: s.align,
                      textShadow: s.shadow ? '0 2px 8px rgba(0,0,0,0.65)' : 'none',
                      WebkitTextStroke: s.strokeWidth ? `${s.strokeWidth}px ${s.strokeColor}` : undefined,
                    }}
                  >
                    {clip.text}
                  </div>
                );
              }
              const src = media?.objectUrl;
              if (!src) return null;
              return (
                <img
                  key={clip.id}
                  className={`tools-video-overlay-item tools-video-overlay-media${selectedClipId === clip.id ? ' is-selected' : ''}`}
                  src={src}
                  alt=""
                  style={{
                    ...style,
                    width: `${((media.width || 240) / project.width) * 100}%`,
                  }}
                  draggable={false}
                />
              );
            })}
            {selectedOverlay && stageReady ? (
              <VideoTransformHandles
                clip={selectedOverlay.clip}
                projectWidth={project.width}
                projectHeight={project.height}
                stageEl={stageRef.current}
                onLive={onTransformLive}
                onBegin={onGestureBegin}
                onEnd={onGestureEnd}
              />
            ) : null}
          </div>

          <div className="tools-video-caption-stage" aria-live="polite">
            {captions.map((clip) => {
              const s = clip.style || {};
              return (
                <div
                  key={clip.id}
                  className="tools-video-caption-cue"
                  style={{
                    color: s.color || '#ffffff',
                    fontFamily: s.fontFamily,
                    fontSize: `calc(${(s.fontSize || 36) / project.height} * 100cqh)`,
                    fontWeight: s.fontWeight || 'bold',
                    textShadow: s.shadow !== false ? '0 2px 8px rgba(0,0,0,0.75)' : 'none',
                  }}
                >
                  {clip.text}
                </div>
              );
            })}
          </div>

          {showSafeMargins ? (
            <div className="tools-video-safe-margins" aria-hidden>
              <div className="tools-video-safe-margins-action" />
              <div className="tools-video-safe-margins-thirds" />
            </div>
          ) : null}

          {transition && transition.type !== 'none' ? (
            <div
              className={`tools-video-transition-fx tools-video-transition-fx--${transition.type}`}
              style={{ opacity: transition.progress }}
              aria-hidden
            />
          ) : null}

          {videoClip?.reverse && !videoClip?.freeze ? (
            <span className="tools-video-player-badge" title="Reverse is approximate in preview">
              Reverse
            </span>
          ) : null}
          {videoClip?.freeze ? (
            <span className="tools-video-player-badge">Freeze</span>
          ) : null}

          <div className="tools-video-player-overlay-controls">
            <button
              type="button"
              className="tools-video-player-play"
              onClick={onTogglePlay}
              aria-label={playing ? 'Pause' : 'Play'}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
            >
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span className="tools-video-player-tc">
              {formatTimecode(playhead, project.fps)}
              <span className="tools-video-player-tc-sep">/</span>
              {formatTimecode(project.durationMs, project.fps)}
            </span>
            <input
              type="range"
              className="tools-video-player-scrub"
              min={0}
              max={Math.max(1, project.durationMs)}
              step={1}
              value={Math.min(playhead, Math.max(1, project.durationMs))}
              onChange={(e) => onSeek(Number(e.target.value), { stop: true })}
              aria-label="Scrub timeline"
              title="Scrub playhead"
            />
            {videoClip && Math.abs(normalizeSpeed(videoClip.speed ?? 1) - 1) > 0.01 ? (
              <span className="tools-video-speed-chip">{normalizeSpeed(videoClip.speed)}×</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
