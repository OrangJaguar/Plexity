import { useRef } from 'react';
import { clipDurationMs, findClip, formatTimecode, getMedia, getSelectedClip } from '@/lib/tools/video/video-project.js';
import { VIDEO_ASPECT_PRESETS } from '@/lib/tools/video/video-limits.js';
import { VIDEO_FILTER_PRESETS } from '@/lib/tools/video/video-filters.js';
import { VIDEO_TRANSITION_TYPES } from '@/lib/tools/video/video-transitions.js';
import { VIDEO_SPEED_MAX, VIDEO_SPEED_MIN, normalizeSpeed } from '@/lib/tools/video/video-speed.js';

/**
 * @param {object} props
 */
export default function VideoInspector({
  project,
  warnings,
  onAspectChange,
  onVolume,
  onOpacity,
  onTransform,
  onText,
  onFilter,
  onTransition,
  onUnlink,
  onDetach,
  onDelete,
  onRippleDelete,
  onDeleteMarker,
  onReplaceMedia,
  onSpeed,
  onFreeze,
  onReverse,
  onFades,
  onAudioRole,
  onDuck,
  showSafeMargins,
  onToggleSafeMargins,
}) {
  const fileRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const clip = getSelectedClip(project);
  const found = clip ? findClip(project, clip.id) : null;
  const media = clip?.mediaId ? getMedia(project, clip.mediaId) : null;

  if (!clip || !found) {
    return (
      <aside className="tools-video-inspector">
        <h2>Project</h2>
        <label className="tools-video-field">
          <span>Aspect</span>
          <select value={project.aspectId} onChange={(e) => onAspectChange(e.target.value)}>
            {VIDEO_ASPECT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <p className="tools-video-inspector-meta">
          {project.width}×{project.height} · {project.fps} fps
        </p>
        <p className="tools-video-inspector-meta">
          Duration {formatTimecode(project.durationMs, project.fps)}
        </p>

        <h3 className="tools-video-rail-subhead">Audio ducking</h3>
        <label className="tools-video-field tools-video-field--check">
          <span>
            <input
              type="checkbox"
              checked={Boolean(project.duck?.enabled)}
              onChange={(e) => onDuck?.({ enabled: e.target.checked })}
            />
            {' '}Duck music under VO
          </span>
        </label>
        {project.duck?.enabled ? (
          <label className="tools-video-field">
            <span>Amount (dB)</span>
            <input
              type="range"
              min={3}
              max={24}
              value={project.duck?.amountDb ?? 12}
              onChange={(e) => onDuck?.({ amountDb: Number(e.target.value) })}
            />
            <span className="tools-video-field-value">{project.duck?.amountDb ?? 12} dB</span>
          </label>
        ) : null}

        <label className="tools-video-field tools-video-field--check">
          <span>
            <input
              type="checkbox"
              checked={Boolean(showSafeMargins)}
              onChange={() => onToggleSafeMargins?.()}
            />
            {' '}Safe margins / thirds
          </span>
        </label>

        {(project.markers || []).length ? (
          <div className="tools-video-inspector-markers">
            <h3>Markers</h3>
            <ul>
              {(project.markers || []).map((m) => (
                <li key={m.id}>
                  <span>{formatTimecode(m.timeMs, project.fps)}</span>
                  <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={() => onDeleteMarker(m.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {warnings?.length ? (
          <ul className="tools-video-warnings">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : (
          <p className="tools-video-inspector-hint">Select a clip to edit properties.</p>
        )}
      </aside>
    );
  }

  const track = found.track;
  const isCaption = clip.kind === 'caption';
  const isText = clip.kind === 'text' || isCaption;
  const isOverlay = track.type === 'overlay' || track.type === 'text' || track.type === 'sticker' || clip.kind === 'sticker';
  const isAudio = track.type === 'audio';
  const isMedia = clip.kind === 'media' || (!clip.kind && media);
  const dur = clipDurationMs(clip);
  const speed = normalizeSpeed(clip.speed ?? 1);

  return (
    <aside className="tools-video-inspector">
      <h2>
        {isCaption ? 'Caption' : isText ? 'Text' : clip.kind === 'sticker' ? 'Sticker' : isAudio ? 'Audio' : 'Clip'}
      </h2>
      {media ? (
        <p className="tools-video-inspector-name" title={media.name}>
          {media.name}
          {media.fromVo ? <span className="tools-video-vo-badge"> VO</span> : null}
        </p>
      ) : null}

      {isText ? (
        <>
          <label className="tools-video-field">
            <span>Content</span>
            <textarea
              rows={3}
              value={clip.text || ''}
              onChange={(e) => onText({ text: e.target.value })}
            />
          </label>
          <label className="tools-video-field">
            <span>Size</span>
            <input
              type="range"
              min={16}
              max={120}
              value={clip.style?.fontSize || (isCaption ? 36 : 48)}
              onChange={(e) => onText({ style: { fontSize: Number(e.target.value) } })}
            />
          </label>
          <label className="tools-video-field">
            <span>Color</span>
            <input
              type="color"
              value={clip.style?.color || '#ffffff'}
              onChange={(e) => onText({ style: { color: e.target.value } })}
            />
          </label>
          <label className="tools-video-field">
            <span>
              <input
                type="checkbox"
                checked={Boolean(clip.style?.shadow)}
                onChange={(e) => onText({ style: { shadow: e.target.checked } })}
              />
              {' '}Shadow
            </span>
          </label>
        </>
      ) : null}

      <dl className="tools-video-inspector-dl">
        <div>
          <dt>In</dt>
          <dd>{formatTimecode(clip.sourceInMs, project.fps)}</dd>
        </div>
        <div>
          <dt>Out</dt>
          <dd>{formatTimecode(clip.sourceOutMs, project.fps)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatTimecode(dur, project.fps)}</dd>
        </div>
        <div>
          <dt>Start</dt>
          <dd>{formatTimecode(clip.timelineStartMs, project.fps)}</dd>
        </div>
      </dl>

      {(isMedia || isAudio) && !isCaption ? (
        <>
          <label className="tools-video-field">
            <span>Speed {speed}×</span>
            <input
              type="range"
              min={VIDEO_SPEED_MIN}
              max={VIDEO_SPEED_MAX}
              step={0.05}
              value={speed}
              onChange={(e) => onSpeed?.(Number(e.target.value))}
            />
          </label>
          <label className="tools-video-field tools-video-field--check">
            <span>
              <input
                type="checkbox"
                checked={Boolean(clip.freeze)}
                onChange={(e) => onFreeze?.(e.target.checked)}
              />
              {' '}Freeze frame
            </span>
          </label>
          <label className="tools-video-field tools-video-field--check">
            <span>
              <input
                type="checkbox"
                checked={Boolean(clip.reverse)}
                onChange={(e) => onReverse?.(e.target.checked)}
              />
              {' '}Reverse
            </span>
          </label>
          {clip.reverse ? (
            <p className="tools-video-inspector-hint">Reverse is approximate in preview; export applies full reverse.</p>
          ) : null}
          <label className="tools-video-field">
            <span>Fade in (ms)</span>
            <input
              type="number"
              min={0}
              max={5000}
              value={clip.fadeInMs || 0}
              onChange={(e) => onFades?.({ fadeInMs: Number(e.target.value) })}
            />
          </label>
          <label className="tools-video-field">
            <span>Fade out (ms)</span>
            <input
              type="number"
              min={0}
              max={5000}
              value={clip.fadeOutMs || 0}
              onChange={(e) => onFades?.({ fadeOutMs: Number(e.target.value) })}
            />
          </label>
        </>
      ) : null}

      {(isAudio || (isMedia && media?.kind === 'video')) && !isCaption ? (
        <label className="tools-video-field">
          <span>Audio role</span>
          <select
            value={clip.audioRole || 'none'}
            onChange={(e) => onAudioRole?.(/** @type {'none'|'music'|'vo'} */ (e.target.value))}
          >
            <option value="none">None</option>
            <option value="music">Music</option>
            <option value="vo">Voiceover</option>
          </select>
        </label>
      ) : null}

      {!isText ? (
        <label className="tools-video-field">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={clip.volume}
            onChange={(e) => onVolume(Number(e.target.value))}
          />
          <span className="tools-video-field-value">{Math.round(clip.volume * 100)}%</span>
        </label>
      ) : null}

      {isOverlay && !isCaption ? (
        <>
          <label className="tools-video-field">
            <span>Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={clip.opacity ?? 1}
              onChange={(e) => onOpacity(Number(e.target.value))}
            />
          </label>
          <label className="tools-video-field">
            <span>Scale</span>
            <input
              type="range"
              min={0.1}
              max={3}
              step={0.01}
              value={clip.transform?.scale ?? 1}
              onChange={(e) => onTransform({ scale: Number(e.target.value) })}
            />
          </label>
          <label className="tools-video-field">
            <span>Rotation</span>
            <input
              type="range"
              min={-180}
              max={180}
              value={clip.transform?.rotation ?? 0}
              onChange={(e) => onTransform({ rotation: Number(e.target.value) })}
            />
          </label>
        </>
      ) : null}

      {track.type === 'video' && isMedia ? (
        <>
          <label className="tools-video-field">
            <span>Filter</span>
            <select
              value={clip.filter?.presetId || 'none'}
              onChange={(e) => onFilter(e.target.value)}
            >
              {VIDEO_FILTER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="tools-video-field">
            <span>Transition out</span>
            <select
              value={clip.transition?.type || 'none'}
              onChange={(e) => onTransition({ type: e.target.value })}
            >
              {VIDEO_TRANSITION_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      <div className="tools-video-inspector-actions">
        {clip.linkedClipId ? (
          <>
            <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--sm" onClick={onUnlink}>
              Unlink A/V
            </button>
            <button type="button" className="pdf-btn pdf-btn--secondary pdf-btn--sm" onClick={onDetach}>
              Detach audio
            </button>
          </>
        ) : null}
        {isMedia ? (
          <>
            <button
              type="button"
              className="pdf-btn pdf-btn--secondary pdf-btn--sm"
              onClick={() => fileRef.current?.click()}
            >
              Replace media
            </button>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="video/*,audio/*,image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void onReplaceMedia(f);
              }}
            />
          </>
        ) : null}
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onDelete}>
          Delete
        </button>
        <button type="button" className="pdf-btn pdf-btn--ghost pdf-btn--sm" onClick={onRippleDelete}>
          Ripple delete
        </button>
      </div>
      {warnings?.length ? (
        <ul className="tools-video-warnings">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
