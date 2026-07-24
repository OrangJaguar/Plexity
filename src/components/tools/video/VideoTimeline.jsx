import { useRef, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Magnet,
  MapPin,
  Scissors,
  Trash2,
  Unlock,
  Unlink,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { clipDurationMs, clipEndMs, formatTimecode, getMedia } from '@/lib/tools/video/video-project.js';
import { hasTransition } from '@/lib/tools/video/video-transitions.js';
import { normalizeSpeed } from '@/lib/tools/video/video-speed.js';

/**
 * @param {object} props
 */
export default function VideoTimeline({
  project,
  snapEnabled,
  onSnapToggle,
  pxPerSecond,
  onZoom,
  onSelect,
  onPlayhead,
  onSplit,
  onDelete,
  onRippleDelete,
  onDuplicate,
  onDetach,
  onMoveLive,
  onTrimLive,
  onGestureBegin,
  onGestureEnd,
  onTrackPatch,
  onAddTrack,
  onPlaceMedia,
  onAddMarker,
  onTrackSolo,
}) {
  const scrollRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [dragging, setDragging] = useState(false);

  const durationMs = Math.max(project.durationMs, 5000);
  const widthPx = Math.max(400, (durationMs / 1000) * pxPerSecond + 80);
  const playheadX = (project.playheadMs / 1000) * pxPerSecond;

  const msFromClientX = (clientX) => {
    const el = scrollRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left + el.scrollLeft - 88;
    return Math.max(0, (x / pxPerSecond) * 1000);
  };

  /** @type {number[]} */
  const rulerMarks = [];
  const stepSec = pxPerSecond >= 80 ? 1 : pxPerSecond >= 40 ? 2 : 5;
  for (let s = 0; s * 1000 <= durationMs + 1000; s += stepSec) rulerMarks.push(s);

  return (
    <div className="tools-video-timeline">
      <div className="tools-video-timeline-toolbar">
        <div className="tools-video-timeline-toolbar-group">
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onSplit} title="Split clip at playhead (B)" aria-label="Split at playhead">
            <Scissors size={14} />
            <span className="tools-video-toolbar-label">Split</span>
          </button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDelete} title="Delete selected clip" aria-label="Delete clip">
            <Trash2 size={14} />
            <span className="tools-video-toolbar-label">Delete</span>
          </button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onRippleDelete} title="Delete clip and close the gap" aria-label="Ripple delete">
            <span className="tools-video-toolbar-label">Ripple</span>
          </button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDuplicate} title="Duplicate selected clip" aria-label="Duplicate clip">
            <Copy size={14} />
            <span className="tools-video-toolbar-label">Duplicate</span>
          </button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDetach} title="Detach linked audio onto its own track" aria-label="Detach audio">
            <Unlink size={14} />
            <span className="tools-video-toolbar-label">Detach</span>
          </button>
          <button
            type="button"
            className={`pdf-btn pdf-btn--ghost pdf-btn--sm${snapEnabled ? ' is-active' : ''}`}
            onClick={onSnapToggle}
            aria-pressed={snapEnabled}
            title="Snap clips to edges and the playhead"
            aria-label="Toggle snap"
          >
            <Magnet size={14} />
            <span className="tools-video-toolbar-label">Snap</span>
          </button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onAddMarker} title="Add a marker at the playhead (M)" aria-label="Add marker">
            <MapPin size={14} />
            <span className="tools-video-toolbar-label">Marker</span>
          </button>
        </div>
        <div className="tools-video-timeline-toolbar-group tools-video-timeline-toolbar-group--tracks">
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onAddTrack('video')} title="Add a video track" aria-label="Add video track">+V</button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onAddTrack('audio')} title="Add an audio track" aria-label="Add audio track">+A</button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onAddTrack('overlay')} title="Add an overlay track" aria-label="Add overlay track">+Ov</button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onAddTrack('text')} title="Add a text track" aria-label="Add text track">+T</button>
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onAddTrack('captions')} title="Add a captions track" aria-label="Add captions track">+C</button>
        </div>
        <div className="tools-video-timeline-toolbar-group tools-video-timeline-toolbar-group--zoom">
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onZoom(Math.max(20, pxPerSecond / 1.25))} aria-label="Zoom timeline out" title="Zoom timeline out">
            <ZoomOut size={14} />
          </button>
          <input type="range" min={20} max={200} value={pxPerSecond} onChange={(e) => onZoom(Number(e.target.value))} aria-label="Timeline zoom" title="Timeline zoom" />
          <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onZoom(Math.min(200, pxPerSecond * 1.25))} aria-label="Zoom timeline in" title="Zoom timeline in">
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      <div
        className="tools-video-timeline-scroll"
        ref={scrollRef}
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes('application/x-plexity-media')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          const mediaId = e.dataTransfer.getData('application/x-plexity-media');
          if (!mediaId) return;
          e.preventDefault();
          onPlaceMedia(mediaId, msFromClientX(e.clientX));
        }}
      >
        <div className="tools-video-timeline-inner" style={{ width: widthPx + 88 }}>
          <div className="tools-video-ruler">
            <div className="tools-video-track-header tools-video-track-header--ruler" />
            <div
              className="tools-video-ruler-scale"
              style={{ width: widthPx }}
              onPointerDown={(e) => onPlayhead(msFromClientX(e.clientX), { stop: true })}
            >
              {rulerMarks.map((s) => (
                <span key={s} className="tools-video-ruler-tick" style={{ left: s * pxPerSecond }}>
                  {formatTimecode(s * 1000, project.fps).replace(/:\d{2}$/, '')}
                </span>
              ))}
              {(project.markers || []).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="tools-video-marker"
                  style={{ left: (m.timeMs / 1000) * pxPerSecond }}
                  title={m.label || 'Marker'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayhead(m.timeMs, { stop: true });
                  }}
                />
              ))}
            </div>
          </div>

          {project.tracks.map((track) => (
            <div key={track.id} className={`tools-video-track tools-video-track--${track.type}${track.hidden ? ' is-hidden' : ''}${track.solo ? ' is-solo' : ''}`}>
              <div className="tools-video-track-header">
                <span className="tools-video-track-name">{track.name}</span>
                <div className="tools-video-track-toggles">
                  <button
                    type="button"
                    className={`tools-video-icon-btn${track.solo ? ' is-active' : ''}`}
                    aria-label="Solo track"
                    title="Solo — hear only this track"
                    aria-pressed={Boolean(track.solo)}
                    onClick={() => onTrackSolo?.(track.id, !track.solo)}
                  >
                    S
                  </button>
                  <button type="button" className="tools-video-icon-btn" aria-label="Mute track" title="Mute track" onClick={() => onTrackPatch(track.id, { muted: !track.muted })}>
                    {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  <button type="button" className="tools-video-icon-btn" aria-label="Lock track" title="Lock track" onClick={() => onTrackPatch(track.id, { locked: !track.locked })}>
                    {track.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                  <button type="button" className="tools-video-icon-btn" aria-label="Hide track" title="Hide track" onClick={() => onTrackPatch(track.id, { hidden: !track.hidden })}>
                    {track.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                </div>
              </div>
              <div
                className="tools-video-track-lane"
                style={{ width: widthPx }}
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) {
                    onPlayhead(msFromClientX(e.clientX), { stop: true });
                    onSelect(null);
                  }
                }}
              >
                {track.clips.map((clip) => {
                  const media = getMedia(project, clip.mediaId);
                  const left = (clip.timelineStartMs / 1000) * pxPerSecond;
                  const width = Math.max(8, (clipDurationMs(clip) / 1000) * pxPerSecond);
                  const selected = project.selectedClipId === clip.id;
                  const kindClass = clip.kind === 'caption'
                    ? 'caption'
                    : clip.kind === 'text'
                      ? 'text'
                      : clip.kind === 'sticker'
                        ? 'sticker'
                        : track.type;
                  const label = clip.kind === 'text' || clip.kind === 'caption'
                    ? (clip.text || (clip.kind === 'caption' ? 'Caption' : 'Text'))
                    : (media?.name || 'Clip');
                  const speed = normalizeSpeed(clip.speed ?? 1);
                  return (
                    <div
                      key={clip.id}
                      className={`tools-video-clip tools-video-clip--${kindClass}${selected ? ' is-selected' : ''}${clip.linkedClipId ? ' is-linked' : ''}${hasTransition(clip.transition) ? ' has-transition' : ''}${clip.freeze ? ' is-freeze' : ''}${clip.reverse ? ' is-reverse' : ''}`}
                      style={{ left, width }}
                      title={label}
                      onPointerDown={(e) => {
                        if (track.locked) {
                          onSelect(clip.id);
                          return;
                        }
                        e.stopPropagation();
                        onSelect(clip.id);
                        const target = /** @type {HTMLElement} */ (e.target);
                        const edge = target.dataset?.edge;
                        const mode = edge === 'left' || edge === 'right' ? edge : 'move';
                        const startX = e.clientX;
                        const startMs = clip.timelineStartMs;
                        const startEnd = clipEndMs(clip);
                        const pointerId = e.pointerId;
                        const node = e.currentTarget;
                        node.setPointerCapture(pointerId);
                        onGestureBegin();
                        setDragging(true);
                        const onMove = (ev) => {
                          const deltaMs = ((ev.clientX - startX) / pxPerSecond) * 1000;
                          if (mode === 'move') onMoveLive(clip.id, Math.max(0, startMs + deltaMs));
                          else if (mode === 'left') onTrimLive(clip.id, 'left', startMs + deltaMs);
                          else onTrimLive(clip.id, 'right', startEnd + deltaMs);
                        };
                        const onUp = () => {
                          node.releasePointerCapture(pointerId);
                          window.removeEventListener('pointermove', onMove);
                          window.removeEventListener('pointerup', onUp);
                          setDragging(false);
                          onGestureEnd();
                        };
                        window.addEventListener('pointermove', onMove);
                        window.addEventListener('pointerup', onUp);
                      }}
                    >
                      <span className="tools-video-clip-edge tools-video-clip-edge--left" data-edge="left" />
                      <span className="tools-video-clip-label">{label}</span>
                      {Math.abs(speed - 1) > 0.01 ? (
                        <span className="tools-video-clip-speed">{speed}×</span>
                      ) : null}
                      {clip.freeze ? <span className="tools-video-clip-flag" title="Freeze">F</span> : null}
                      {clip.reverse ? <span className="tools-video-clip-flag" title="Reverse">R</span> : null}
                      {hasTransition(clip.transition) ? <span className="tools-video-clip-transition" title={clip.transition.type} /> : null}
                      <span className="tools-video-clip-edge tools-video-clip-edge--right" data-edge="right" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="tools-video-playhead" style={{ left: 88 + playheadX }} aria-hidden />
        </div>
      </div>
      {dragging ? <span className="sr-only">Dragging clip</span> : null}
    </div>
  );
}
